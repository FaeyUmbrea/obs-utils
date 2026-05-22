import type { OverlayComponentData, OverlayData } from './types.ts';
import { getByTriggerOrDataPath } from './helpers.ts';

/**
 * "How do we iterate this overlay?" Each overlay gets one entry in the tree
 * per context — actor, user, or singleton — depending on its `tileBy` config.
 */
export type TileMode = 'actors' | 'players' | 'users' | 'once';

/**
 * Context attached to one (overlay × tile) instance. The renderer uses it to
 * resolve actor-shaped paths and to label the resulting tile.
 */
export interface RenderContext {
	/** Stable per-tile key. Tree consumers use this for keyed-each iteration. */
	key: string;
	/** Actor for this tile, when known. Implicit AV subscriptions filter on this. */
	actor?: { id: string; name?: string } | null;
	/** User for this tile, when `tileBy: 'players'`. */
	user?: { id: string; name?: string } | null;
}

/**
 * Snapshot of every reactive input the renderer reads. `buildRenderTree` is a
 * pure function of (config, state) — keep this serializable.
 */
export interface RenderState {
	/** Indexed by actor id. Pulled from the registry's `core.actorData` cache. */
	actors: Map<string, unknown>;
	/** Indexed by user id. Pulled from `core.userData` (or equivalent) once we add it. */
	users: Map<string, unknown>;
	/** Latest payload per overlay-level trigger key. Indexed by `trigger.eventKey`. */
	triggerPayloads: Map<string, Record<string, unknown> | undefined>;
	/**
	 * Per (overlay-id × tile-key) frame snapshot from the active track. The
	 * track playback engine computes these and writes them here; the renderer
	 * applies them to each component on render.
	 */
	frames?: Map<string, OverlayFrame>;
	/**
	 * Editor-preview mode disables payload-context filtering so every tile
	 * shows the trigger data regardless of actor/user match. /stream sets
	 * this to false (the default).
	 */
	previewMode?: boolean;
}

/**
 * A single resolved frame of track playback for one (overlay × tile-key).
 * Holds per-component opacity and transform, plus which track is active and
 * the current playhead time within it.
 */
export interface OverlayFrame {
	activeTrackId: string;
	playheadT: number;
	/** Per component id: opacity + transform values at the current playhead. */
	components: Map<string, ComponentFrame>;
	/** The trigger key that drove this tile into its current track (if any).
	 *  Components resolve `trigger.*` paths against `state.triggerPayloads.get(triggerKey)`. */
	triggerKey?: string;
}

export interface ComponentFrame {
	opacity: number;
	x: number;
	y: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
}

export interface RenderTree {
	overlays: RenderedOverlay[];
}

export interface RenderedOverlay {
	/** Stable id = `${overlay.id}:${context.key}`. */
	id: string;
	overlayId: string;
	context: RenderContext;
	visible: boolean;
	type: string;
	style: string;
	x: number;
	y: number;
	w: number;
	h: number;
	components: RenderedComponent[];
}

/**
 * Resolved values for a leaf component, keyed by field name. Each component
 * type declares the fields it consumes (`value`, `icon1`, `image2`, …). The
 * renderer fills them in `buildComponent`; leaves never resolve paths.
 */
export type ResolvedValues = Record<string, unknown>;

export interface RenderedComponent {
	id: string;
	index: number;
	type: string;
	/** Pre-resolved values for the leaf. Shape varies by component type. */
	values: ResolvedValues;
	style: string;
	customCSS?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	rotation: number;
	/** Per-frame opacity + transform from the active track. Defaults to identity (opacity 1, no transform) when no animation. */
	frame?: ComponentFrame;
}

export interface BuildRenderTreeOptions {
	/**
	 * Override per-overlay tile mode. Future-proofs the renderer for the upcoming
	 * `OverlayData.tileBy` config field without forcing every call site to read
	 * it from the overlay directly. Defaults to `'actors'`.
	 */
	tileBy?: (overlay: OverlayData) => TileMode;
	/** List of actor ids the host wants to iterate when an overlay tiles by actors. */
	actorIds?: string[];
	/** List of user ids the host wants to iterate when an overlay tiles by players. */
	userIds?: string[];
	/** List of user ids (including GMs) the host iterates when tileBy is 'users'. */
	allUserIds?: string[];
}

/**
 * Resolve one overlay layer × one context into a `RenderedOverlay`. Pure;
 * given the same inputs always produces the same shape. Components inside are
 * resolved against the context's actor (for `actor.*` paths) and any
 * per-trigger payload state carried on `RenderState.triggerPayloads`.
 *
 * Visibility for triggered overlays is governed by the active track / frame,
 * not a separate `visible` flag — invisible content is just opacity 0 driven
 * by track keyframes, so the layout box stays reserved.
 */
function buildOverlay(
	overlay: OverlayData,
	context: RenderContext,
	state: RenderState,
): RenderedOverlay {
	const actor = context.actor ? state.actors.get(context.actor.id) : undefined;
	const frameSet = state.frames?.get(`${overlay.id ?? ''}:${context.key}`);
	const triggerPayload = resolveTriggerPayload(overlay, context, frameSet, state);

	const components: RenderedComponent[] = overlay.components.map((c, index) =>
		buildComponent(c, index, actor, triggerPayload, frameSet),
	);

	return {
		id: `${overlay.id ?? ''}:${context.key}`,
		overlayId: overlay.id ?? '',
		context,
		visible: true,
		type: overlay.type,
		style: overlay.style ?? '',
		x: (overlay.config?.x as number) ?? 0,
		y: (overlay.config?.y as number) ?? 0,
		w: (overlay.config?.w as number) ?? 300,
		h: (overlay.config?.h as number) ?? 300,
		components,
	};
}

/**
 * Per-component-type resolver. Each takes the raw data string and produces
 * the `values` dict the leaf component will consume. New component types must
 * register here. Pure functions — given the same inputs, produce the same
 * output, so each resolver is trivially unit-testable.
 */
type ResolveFn = (data: string, actor: unknown, triggerPayload: Record<string, unknown> | undefined) => ResolvedValues;

function resolveSinglePath(data: string, actor: unknown, payload: Record<string, unknown> | undefined): unknown {
	return getByTriggerOrDataPath(actor, payload, data);
}

function asNonNegativeNumber(raw: unknown): number {
	const n = Number(raw);
	return Number.isNaN(n) || n < 0 ? 0 : n;
}

/**
 * Heuristic: does this `data` string look like a path the renderer should
 * resolve (trigger.* or dotted-identifier-only), as opposed to a literal value
 * the leaf should display verbatim? URLs contain dots but also slashes /
 * colons, so we restrict the dotted-identifier branch to strings that are
 * *only* word chars and dots.
 */
function looksLikeDataPath(data: string): boolean {
	if (data.startsWith('trigger.')) return true;
	return data.includes('.') && /^[\w.]+$/.test(data);
}

const RESOLVERS: Record<string, ResolveFn> = {
	// Plain text / simple actor-value display. The leaf is presentational only;
	// the path/literal decision and the empty-fallback already happen here.
	pt: (data, actor, payload) => {
		const resolved = resolveSinglePath(data, actor, payload);
		const value = resolved !== '' && resolved !== undefined
			? String(resolved)
			: (looksLikeDataPath(data ?? '') ? '' : (data ?? ''));
		return { value };
	},

	// Font Awesome icon — `data` is the icon class string itself, no resolution.
	fai: data => ({ value: data ?? '' }),

	// Standalone image — `data` is a URL or actor path returning a URL.
	img: (data, actor, payload) => {
		const resolved = resolveSinglePath(data, actor, payload);
		const value = resolved !== '' && resolved !== undefined
			? String(resolved)
			: (looksLikeDataPath(data ?? '') ? '' : (data ?? ''));
		return { value };
	},

	// Boolean AV icon — data is "path;trueIcon;falseIcon".
	bav: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		return {
			value: resolveSinglePath(parts[0] ?? '', actor, payload),
			icon1: parts[1] ?? 'fa-solid fa-check',
			icon2: parts[2] ?? 'fa-solid fa-x',
		};
	},

	// Boolean AV image — data is "path;trueImage;falseImage".
	bavimg: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		return {
			value: resolveSinglePath(parts[0] ?? '', actor, payload),
			image1: parts[1] ?? '',
			image2: parts[2] ?? '',
		};
	},

	// Multi-icon AV — data is "valuePath;filledIcon;maxPath;emptyIcon".
	// value1 = filled count, value2 = empty count (max - filled, clamped).
	micoav: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		const value1 = asNonNegativeNumber(resolveSinglePath(parts[0] ?? '', actor, payload));
		const max = asNonNegativeNumber(resolveSinglePath(parts[2] ?? '', actor, payload));
		const value2 = Math.max(0, max - value1);
		return { value1, value2, icon1: parts[1] ?? '', icon2: parts[3] ?? '' };
	},

	// Multi-image AV — same shape as micoav but with image paths.
	mimgav: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		const value1 = asNonNegativeNumber(resolveSinglePath(parts[0] ?? '', actor, payload));
		const max = asNonNegativeNumber(resolveSinglePath(parts[2] ?? '', actor, payload));
		const value2 = Math.max(0, max - value1);
		return { value1, value2, image1: parts[1] ?? '', image2: parts[3] ?? '' };
	},

	// Progress bar — data is "valuePath;maxPath".
	pb: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		const value = asNonNegativeNumber(resolveSinglePath(parts[0] ?? '', actor, payload));
		const max = asNonNegativeNumber(resolveSinglePath(parts[1] ?? '', actor, payload));
		return { value, max };
	},
};

/**
 * Public form of the per-type resolver dispatch. Editor canvases and any other
 * non-tree-driven renderer can call this directly to compute a leaf
 * component's `values` dict from raw inputs.
 */
export function resolveComponentValues(
	type: string,
	data: string,
	actor: unknown,
	payload: Record<string, unknown> | undefined,
): ResolvedValues {
	const fn = RESOLVERS[type];
	if (fn) return fn(data ?? '', actor, payload);
	return { value: data ?? '' };
}

/**
 * Pick the payload that `trigger.*` paths on this overlay should resolve
 * against. The tile's `tileBy` mode controls how the payload is filtered:
 *  - `actors`: only payloads whose `actor.id` matches the tile's actor.
 *  - `players` / `users`: only payloads whose `user.id` matches the tile's
 *     user (or whose actor is the tile's user's character).
 *  - `once` (singleton): any payload.
 *
 * Within the candidates, preference goes to:
 *   1. The trigger that most recently transitioned this tile (`frame.triggerKey`).
 *   2. The latest payload of any trigger this overlay has a transition for.
 *   3. The latest payload of any registered trigger at all — lets ambient
 *      `trigger.foo` paths still render without the user having to wire
 *      every transition explicitly.
 */
function resolveTriggerPayload(
	overlay: OverlayData,
	context: RenderContext,
	frame: OverlayFrame | undefined,
	state: RenderState,
): Record<string, unknown> | undefined {
	const tileBy = overlay.tileBy ?? 'actors';

	const matchesContext = (payload: Record<string, any> | undefined): boolean => {
		if (!payload) return false;
		// Editor preview disables filtering — every tile renders every payload.
		if (state.previewMode) return true;
		if (tileBy === 'once') return true;
		if (tileBy === 'actors') {
			const tileActorId = context.actor?.id;
			if (!tileActorId) return true;
			const payloadActorId
				= payload.actor?.id
				?? payload.message?.speaker?.actor
				?? null;
			return payloadActorId === tileActorId;
		}
		// players / users
		const tileUserId = context.user?.id;
		if (!tileUserId) return false;
		const payloadUserId
			= payload.user?.id
			?? payload.message?.user?.id
			?? null;
		return payloadUserId === tileUserId;
	};

	if (frame?.triggerKey) {
		const p = state.triggerPayloads.get(frame.triggerKey);
		if (matchesContext(p as Record<string, any> | undefined)) return p;
	}
	for (const tr of overlay.animation?.transitions ?? []) {
		const p = state.triggerPayloads.get(tr.triggerKey);
		if (matchesContext(p as Record<string, any> | undefined)) return p;
	}
	for (const p of state.triggerPayloads.values()) {
		if (matchesContext(p as Record<string, any> | undefined)) return p;
	}
	return undefined;
}

function buildComponent(
	c: OverlayComponentData,
	index: number,
	actor: unknown,
	triggerPayload: Record<string, unknown> | undefined,
	frameSet: OverlayFrame | undefined,
): RenderedComponent {
	return {
		id: c.id ?? `comp-${index}`,
		index,
		type: c.type,
		values: resolveComponentValues(c.type, c.data, actor, triggerPayload),
		style: c.style ?? '',
		customCSS: c.customCSS,
		x: c.x ?? 0,
		y: c.y ?? 0,
		w: c.w ?? 100,
		h: c.h ?? 30,
		rotation: c.rotation ?? 0,
		frame: frameSet?.components.get(c.id ?? `comp-${index}`),
	};
}

/**
 * Top-level entry point. Given the static overlay catalog and the current
 * reactive state snapshot, produce a flat list of (overlay × context) tiles
 * ready for the renderer to iterate. The host is responsible for re-running
 * `buildRenderTree` whenever any input changes — typically via a Svelte
 * `$derived` that depends on the registry's stores.
 */
export function buildRenderTree(
	config: OverlayData[] | null | undefined,
	state: RenderState,
	options: BuildRenderTreeOptions = {},
): RenderTree {
	const tileBy = options.tileBy ?? ((o: OverlayData) => o.tileBy ?? 'actors');
	const overlays: RenderedOverlay[] = [];
	if (!Array.isArray(config)) return { overlays };

	for (const overlay of config) {
		if (overlay.enabled === false) continue;
		const mode = tileBy(overlay);
		const contexts = expandContexts(mode, overlay, state, options);
		for (const ctx of contexts) overlays.push(buildOverlay(overlay, ctx, state));
	}

	return { overlays };
}

/**
 * Editor convenience: build a single `RenderedOverlay` tile from raw config and
 * an optional preview actor. Used by Canvas to render the Simple Overlay
 * preview without standing up a full registry + state pipeline.
 */
export function buildPreviewOverlay(
	overlay: OverlayData,
	actor: unknown,
	overrideFrame?: OverlayFrame,
): RenderedOverlay {
	const actorRef = actor as { id?: string; name?: string } | undefined;
	const context: RenderContext = actorRef?.id
		? { key: `actor:${actorRef.id}`, actor: { id: actorRef.id, name: actorRef.name } }
		: { key: 'singleton' };
	const state: RenderState = {
		actors: new Map(actorRef?.id ? [[actorRef.id, actor]] : []),
		users: new Map(),
		triggerPayloads: new Map(),
	};
	// Inject an editor-supplied frame (animation scrub) so `buildOverlay`'s
	// `state.frames` lookup finds it and applies opacity/transform values per
	// component. The playback engine is bypassed entirely on this path.
	if (overrideFrame) {
		state.frames = new Map([[`${overlay.id ?? ''}:${context.key}`, overrideFrame]]);
	}
	return buildOverlay(overlay, context, state);
}

function expandContexts(
	mode: TileMode,
	overlay: OverlayData,
	state: RenderState,
	options: BuildRenderTreeOptions,
): RenderContext[] {
	if (mode === 'once') return [{ key: 'singleton' }];
	if (mode === 'players' || mode === 'users') {
		const idList = mode === 'users' ? (options.allUserIds ?? []) : (options.userIds ?? []);
		return idList.map((id) => {
			const u = state.users.get(id) as { name?: string; character?: { id: string; name?: string } } | undefined;
			return {
				key: `user:${id}`,
				user: { id, name: u?.name },
				actor: u?.character ? { id: u.character.id, name: u.character.name } : null,
			};
		});
	}
	// actors
	const ids = options.actorIds ?? [];
	return ids.map((id) => {
		const a = state.actors.get(id) as { name?: string } | undefined;
		return { key: `actor:${id}`, actor: { id, name: a?.name } };
	});
}
