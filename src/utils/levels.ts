import type { ReadyGame } from 'fvtt-types/configuration';
import { getSetting, setSetting } from './settings.ts';

// ─── Foundry v14 Scene Levels ─────────────────────────────────────────────
//
// Levels are a v14 addition and the module still targets 13.344, so nothing
// here may assume the API exists. Everything is feature-detected rather than
// version-sniffed: on v13 `canvas.level` is undefined, `scene.levels` is
// absent, and every function below degrades to "no opinion about floors",
// which is exactly the current behaviour.
//
// fvtt-types is pinned to 13.x, so the v14 surface is reached through narrow
// local shapes rather than casts scattered at each call site.

interface LevelLike { id: string; sort: number; elevation?: { bottom?: number } }
interface SceneLike {
	tokenVision?: boolean;
	levels?: { get: (id: string) => LevelLike | undefined; contents?: LevelLike[] };
	tokens?: Iterable<TokenDocument>;
	view?: (options: object) => Promise<unknown>;
}

function getScene(): SceneLike | undefined {
	return (game as ReadyGame).canvas?.scene as unknown as SceneLike | undefined;
}

/** The floor this client is displaying, or undefined where Scene Levels doesn't exist. */
export function getCurrentLevelId(): string | undefined {
	return (canvas as unknown as { level?: { id?: string } } | undefined)?.level?.id;
}

/** False on v13, and on any v14 scene that has no levels configured. */
export function sceneHasLevels(): boolean {
	const levels = getScene()?.levels?.contents;
	return Array.isArray(levels) && levels.length > 0;
}

/** A token's floor, or undefined on v13. */
export function getTokenLevelId(token: Token | undefined): string | undefined {
	return (token?.document as unknown as { _source?: { level?: string } } | undefined)?._source?.level;
}

/**
 * Scene floors ordered bottom to top.
 *
 * By `elevation.bottom`, with `sort` only as a tiebreaker. `Scene#prepareEmbeddedDocuments`
 * defines `levels.sorted` as `a.sort - b.sort`, but on real scenes `sort` is
 * routinely 0 on every floor — it is on all four of The Restored Keep's — so
 * that comparator returns 0 for every pair and core's order survives purely
 * because `Array#sort` is stable and insertion order happened to be right.
 * Elevation is the field that actually carries the vertical relationship
 * (-20 / 0 / 20 / 40 on that scene), and "highest occupied floor" is meaningless
 * without it.
 */
export function getSortedLevels(): LevelLike[] {
	const levels = getScene()?.levels?.contents;
	if (!Array.isArray(levels)) return [];
	return [...levels].sort((a, b) => (a.elevation?.bottom ?? 0) - (b.elevation?.bottom ?? 0) || a.sort - b.sort);
}

/**
 * Can this client legally display the given floor?
 *
 * Core admits a non-GM to exactly those floors holding a token they can
 * observe. Computed here rather than read off `Scene#availableLevels`, which is
 * memoised and invalidated only in `prepareEmbeddedDocuments` — it can be stale
 * precisely while the party is moving between floors.
 */
export function canUserViewLevel(user: User | undefined, levelId: string): boolean {
	const scene = getScene();
	if (!scene || !user) return false;
	if (user.isGM || !scene.tokenVision) return true;
	for (const token of scene.tokens ?? []) {
		if ((token as unknown as { _source: { level?: string } })._source.level !== levelId) continue;
		try {
			if (token.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)) return true;
		} catch {
			// testUserPermission can throw on partially-initialised documents.
		}
	}
	return false;
}

export function canViewLevel(levelId: string): boolean {
	return canUserViewLevel((game as ReadyGame).user, levelId);
}

let levelRequestSeq = 0;
let levelChain: Promise<unknown> = Promise.resolve();

/**
 * Move this client to `levelId` if it isn't already there.
 *
 * Returns false when the floor is unreachable, so the caller can hold its last
 * good frame. Panning to a correct coordinate on a floor the stream isn't
 * showing is a wrong frame, not a graceful degradation.
 */
export async function applyLevel(levelId: string | undefined): Promise<boolean> {
	if (!levelId) return true;
	const current = getCurrentLevelId();
	// undefined means this build has no Scene Levels at all.
	if (current === undefined || current === levelId) return true;
	if (!canViewLevel(levelId)) return false;
	const view = getScene()?.view;
	if (!view) return false;

	// A level change is a full canvas redraw and takes real time. Two of them
	// issued close together — a party crossing floors, or the policy changing
	// twice — would otherwise run concurrently and leave the client on whichever
	// redraw happened to finish last rather than the one most recently asked
	// for. Serialise them, and drop any request that a newer one has already
	// superseded.
	const seq = ++levelRequestSeq;
	levelChain = levelChain
		.then(async () => {
			// `scene.view()` refuses outright while the canvas is still loading —
			// it warns and returns, dropping the change silently. That is exactly
			// the state a freshly-loaded OBS client is in when it first evaluates
			// its tracking mode, which otherwise leaves the stream on whatever
			// floor Foundry happened to pick. Core guards the same call this way.
			await (canvas as unknown as { initializing?: Promise<unknown> } | undefined)?.initializing;
			if (seq !== levelRequestSeq) return undefined;
			if (getCurrentLevelId() === levelId) return undefined;
			return view.call(getScene(), { level: levelId });
		})
		.catch(() => undefined);
	await levelChain;

	// A superseded request reports failure so its caller skips the pan that
	// belonged to it — that position is for a floor we are no longer showing.
	return seq === levelRequestSeq;
}

// ─── Per-scene pins ───────────────────────────────────────────────────────
//
// A level id and a token id only mean anything inside one scene, and module
// settings are world-scoped, so a plain setting would resolve to nothing the
// moment the GM changes scene. Kept as one scene-keyed map so the existing
// getSetting/setSetting plumbing (including the OBS-client proxy) still applies.

export interface ScenePins { level?: string; levelToken?: string; trackedToken?: string }

export function getScenePins(sceneId?: string): ScenePins {
	const id = sceneId ?? (game as ReadyGame).canvas?.scene?.id;
	if (!id) return {};
	const all = (getSetting('levelPins') ?? {}) as Record<string, ScenePins>;
	return all[id] ?? {};
}

/** Merge a change into the current scene's pins, leaving every other scene's alone. */
export async function setScenePin(patch: Partial<ScenePins>, sceneId?: string): Promise<void> {
	const id = sceneId ?? (game as ReadyGame).canvas?.scene?.id;
	if (!id) return;
	const all = { ...((getSetting('levelPins') ?? {}) as Record<string, ScenePins>) };
	all[id] = { ...(all[id] ?? {}), ...patch };
	await setSetting('levelPins', all);
}

/** Tokens on the active scene, for the Director's pickers. */
export function getSceneTokenChoices(): { id: string; name: string; level?: string }[] {
	const scene = getScene();
	const out: { id: string; name: string; level?: string }[] = [];
	for (const token of scene?.tokens ?? []) {
		const doc = token as unknown as { id?: string; name?: string; _source?: { level?: string } };
		if (!doc.id) continue;
		out.push({ id: doc.id, name: doc.name ?? doc.id, level: doc._source?.level });
	}
	return out;
}

/** Floors of the active scene, bottom to top, for the Director's pickers. */
export function getLevelChoices(): { id: string; name: string }[] {
	return getSortedLevels().map(level => ({
		id: level.id,
		name: (level as unknown as { name?: string }).name ?? level.id,
	}));
}

/**
 * Resolve which floor the camera should stand on for a tracked group.
 *
 * Only consulted by the modes with no inherent answer — the multi-token modes
 * and birdseye. Returns undefined to mean "no opinion", which leaves the client
 * on whatever floor it is already displaying.
 */
export function resolveLevelForTokens(tokens: Token[]): string | undefined {
	if (!sceneHasLevels()) return undefined;
	const pins = getScenePins();
	const policy = (getSetting('levelPolicy') as string | undefined) ?? 'relative';

	if (policy === 'token') {
		return levelOfPinnedToken(pins.levelToken);
	}
	if (policy === 'pinned') {
		// Reachability is tested against the tracked set we already
		// permission-filtered, never against the memoised availableLevels.
		if (pins.level && canViewLevel(pins.level)) return pins.level;
		// Falls through to `relative`, which must therefore always resolve.
	}
	return relativeLevel(tokens);
}

function levelOfPinnedToken(tokenId: string | undefined): string | undefined {
	if (!tokenId) return undefined;
	// Store ids, never placeables — objects are destroyed and rebuilt on redraw.
	const token = (game as ReadyGame).canvas?.tokens?.get(tokenId) as Token | undefined;
	return getTokenLevelId(token);
}

function relativeLevel(tokens: Token[]): string | undefined {
	const order = getSortedLevels();
	if (order.length === 0) return undefined;

	const occupied = order.filter(level => tokens.some(t => getTokenLevelId(t) === level.id));
	if (occupied.length === 0) return undefined;

	const rule = (getSetting('levelRelativeRule') as string | undefined) ?? 'lowest';
	if (rule === 'highest') return occupied[occupied.length - 1].id;
	if (rule === 'middle') {
		// Chosen from *occupied* floors only. Picking the midpoint of the whole
		// range could land on an empty floor — tokens on 1 and 3 with nothing on
		// 2 — which yields empty bounds and freezes the camera.
		return occupied[Math.floor((occupied.length - 1) / 2)].id;
	}
	return occupied[0].id;
}

/** Drop tokens that aren't on the chosen floor, so the bounding box can't straddle. */
export function tokensOnLevel(tokens: Token[], levelId: string | undefined): Token[] {
	if (!levelId) return tokens;
	const onLevel = tokens.filter(t => getTokenLevelId(t) === levelId);
	// A floor with nothing on it would produce empty bounds and freeze the
	// camera; better to frame the wrong floor than to stop moving entirely.
	return onLevel.length > 0 ? onLevel : tokens;
}
