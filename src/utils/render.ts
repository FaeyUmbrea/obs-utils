import type { OverlayComponentData, OverlayData } from './types.ts';
import { getByTriggerOrDataPath } from './helpers.ts';

export type TileMode = 'actors' | 'players' | 'users' | 'once';

export interface RenderContext {
	key: string;
	actor?: { id: string; name?: string } | null;
	user?: { id: string; name?: string } | null;
}

export interface RenderState {
	actors: Map<string, unknown>;
	users: Map<string, unknown>;
	triggerPayloads: Map<string, Record<string, unknown> | undefined>;
	frames?: Map<string, OverlayFrame>;
	previewMode?: boolean;
}

export interface OverlayFrame {
	activeTrackId: string;
	playheadT: number;
	components: Map<string, ComponentFrame>;
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

export type ResolvedValues = Record<string, unknown>;

export interface RenderedComponent {
	id: string;
	index: number;
	type: string;
	values: ResolvedValues;
	style: string;
	customCSS?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	rotation: number;
	frame?: ComponentFrame;
}

export interface BuildRenderTreeOptions {
	tileBy?: (overlay: OverlayData) => TileMode;
	actorIds?: string[];
	userIds?: string[];
	allUserIds?: string[];
}

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

type ResolveFn = (data: string, actor: unknown, triggerPayload: Record<string, unknown> | undefined) => ResolvedValues;

function resolveSinglePath(data: string, actor: unknown, payload: Record<string, unknown> | undefined): unknown {
	return getByTriggerOrDataPath(actor, payload, data);
}

function asNonNegativeNumber(raw: unknown): number {
	const n = Number(raw);
	return Number.isNaN(n) || n < 0 ? 0 : n;
}

// URLs contain dots and slashes — restrict path-detection to word chars + dots.
function looksLikeDataPath(data: string): boolean {
	if (data.startsWith('trigger.')) return true;
	return data.includes('.') && /^[\w.]+$/.test(data);
}

const RESOLVERS: Record<string, ResolveFn> = {
	pt: (data, actor, payload) => {
		const resolved = resolveSinglePath(data, actor, payload);
		const value = resolved !== '' && resolved !== undefined
			? String(resolved)
			: (looksLikeDataPath(data ?? '') ? '' : (data ?? ''));
		return { value };
	},

	fai: data => ({ value: data ?? '' }),

	img: (data, actor, payload) => {
		const resolved = resolveSinglePath(data, actor, payload);
		const value = resolved !== '' && resolved !== undefined
			? String(resolved)
			: (looksLikeDataPath(data ?? '') ? '' : (data ?? ''));
		return { value };
	},

	// data: path;trueIcon;falseIcon
	bav: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		return {
			value: resolveSinglePath(parts[0] ?? '', actor, payload),
			icon1: parts[1] ?? 'fa-solid fa-check',
			icon2: parts[2] ?? 'fa-solid fa-x',
		};
	},

	// data: path;trueImage;falseImage
	bavimg: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		return {
			value: resolveSinglePath(parts[0] ?? '', actor, payload),
			image1: parts[1] ?? '',
			image2: parts[2] ?? '',
		};
	},

	// data: valuePath;filledIcon;maxPath;emptyIcon
	micoav: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		const value1 = asNonNegativeNumber(resolveSinglePath(parts[0] ?? '', actor, payload));
		const max = asNonNegativeNumber(resolveSinglePath(parts[2] ?? '', actor, payload));
		const value2 = Math.max(0, max - value1);
		return { value1, value2, icon1: parts[1] ?? '', icon2: parts[3] ?? '' };
	},

	// data: valuePath;filledImage;maxPath;emptyImage
	mimgav: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		const value1 = asNonNegativeNumber(resolveSinglePath(parts[0] ?? '', actor, payload));
		const max = asNonNegativeNumber(resolveSinglePath(parts[2] ?? '', actor, payload));
		const value2 = Math.max(0, max - value1);
		return { value1, value2, image1: parts[1] ?? '', image2: parts[3] ?? '' };
	},

	// data: valuePath;maxPath
	pb: (data, actor, payload) => {
		const parts = (data ?? '').split(';');
		const value = asNonNegativeNumber(resolveSinglePath(parts[0] ?? '', actor, payload));
		const max = asNonNegativeNumber(resolveSinglePath(parts[1] ?? '', actor, payload));
		return { value, max };
	},
};

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

function resolveTriggerPayload(
	overlay: OverlayData,
	context: RenderContext,
	frame: OverlayFrame | undefined,
	state: RenderState,
): Record<string, unknown> | undefined {
	const tileBy = overlay.tileBy ?? 'actors';

	const matchesContext = (payload: Record<string, any> | undefined): boolean => {
		if (!payload) return false;
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
	const ids = options.actorIds ?? [];
	return ids.map((id) => {
		const a = state.actors.get(id) as { name?: string } | undefined;
		return { key: `actor:${id}`, actor: { id, name: a?.name } };
	});
}
