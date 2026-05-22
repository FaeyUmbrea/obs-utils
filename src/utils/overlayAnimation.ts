/**
 * Overlay-level animation data model.
 *
 * An overlay has one or more **tracks**. Each track is a timeline of opacity +
 * transform changes for every component on the overlay. Event triggers cause
 * **transitions** between tracks. With one track there's nothing to transition
 * to, so triggers only matter once a second track exists.
 */

export type TransformAxis = 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY';

/** The six animatable scalar properties for a component. */
export type AnimatablePropertyKey = 'opacity' | 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY';

export const ANIMATABLE_PROPERTIES: AnimatablePropertyKey[] = [
	'opacity', 'x', 'y', 'rotation', 'scaleX', 'scaleY',
];

// ─── D6: structured easing ────────────────────────────────────────────────────

export type EasingInterpolation = 'constant' | 'linear' | 'bezier';

export type EasingEquation =
	| 'sinusoidal' | 'quadratic' | 'cubic' | 'quartic' | 'quintic'
	| 'exponential' | 'circular' | 'back' | 'bounce' | 'elastic';

export type EasingDirection = 'in' | 'out' | 'inout' | 'auto';

/**
 * Structured easing descriptor used by per-property keyframes (D6).
 * Intentionally separate from the flat `EasingKind` used by camera presets,
 * so the camera code path is unaffected.
 */
export interface EasingV2 {
	interpolation: EasingInterpolation;
	/** Only meaningful when interpolation === 'bezier'. Defaults to 'sinusoidal'. */
	equation?: EasingEquation;
	/** Only meaningful when interpolation === 'bezier'. Defaults to 'auto'. */
	direction?: EasingDirection;
}

export const DEFAULT_EASING_V2: EasingV2 = {
	interpolation: 'bezier',
	equation: 'sinusoidal',
	direction: 'auto',
};

// ─── D1: per-property keyframes ───────────────────────────────────────────────

/**
 * A single keyframe for one scalar property.
 */
export interface PropertyKeyframe {
	/** Time in ms within the track. */
	t: number;
	/** The property value at this keyframe. */
	v: number;
	/** Easing into this keyframe. Absent = bezier/sinusoidal/auto. */
	easing?: EasingV2;
}

/**
 * One sample on a component's track at a specific time within the track.
 * The renderer linearly interpolates between adjacent keyframes (with optional
 * easing) to produce the per-frame opacity + transform values fed to the leaf.
 *
 * Legacy shape — kept for backward-compat with persisted data. New authoring
 * uses `propertyKeyframes` on `TrackComponentLane` instead.
 */
export interface TrackKeyframe {
	/** Time in ms within the track. 0 is the track start. */
	t: number;
	/** Opacity at this keyframe (0..1). Undefined = inherit from previous keyframe. */
	opacity?: number;
	/** Translation X in canvas units. Undefined = inherit. */
	x?: number;
	y?: number;
	/** Rotation in degrees. Undefined = inherit. */
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	/** Easing curve into this keyframe. Defaults to linear. */
	ease?: string;
}

/**
 * Per-component track data. The canonical storage is `propertyKeyframes` — one
 * sorted array per animatable property. The legacy `keyframes` field is still
 * accepted on read and migrated on the fly; it is never written by new code.
 *
 * Keyframes within each property array are sorted ascending by `t`. A component
 * with no entries for a given property falls back to the base style value
 * (opacity 1 / transform identity).
 */
export interface TrackComponentLane {
	/** Matches `OverlayComponentData.id`. */
	componentId: string;
	/**
	 * Legacy mixed-property keyframes. Kept for reading persisted data; callers
	 * should use `propertyKeyframes` for new mutations. `lanePropertyKeyframes()`
	 * merges both sources transparently.
	 */
	keyframes: TrackKeyframe[];
	/**
	 * Per-property sorted keyframe arrays. Only properties the user has opted
	 * into are present; absent properties render at their base-style value.
	 */
	propertyKeyframes?: Partial<Record<AnimatablePropertyKey, PropertyKeyframe[]>>;
}

/**
 * Behavior of a track when its playhead reaches the end. Static tracks never
 * play in the first place — they hold the authored snapshot at t=0 with no
 * runtime overhead. The renderer fast-paths them.
 */
export type TrackBehavior =
	| { type: 'static' }
	| { type: 'looping' }
	| { type: 'transition-on-end'; toTrackId: string; toTime: number };

/** Where a transition zone sends the playhead when its trigger fires inside it. */
export type ZoneDestination =
	| { type: 'goto'; toTrackId: string; toTime: number }
	| { type: 'ignore' };

/**
 * A timestamp range on the source track. When a trigger fires while the
 * playhead is inside `[startT, endT)`, the zone's destination is applied. If
 * no zone covers the current playhead position, the trigger is ignored
 * (callers can author a full-length default zone explicitly when they want a
 * single uniform behavior).
 */
export interface TransitionZone {
	startT: number;
	endT: number;
	destination: ZoneDestination;
}

/**
 * Per (source track × trigger) configuration. The Animation editor renders
 * the zones graphically on the source track's timeline; transitions for the
 * *active* track determine what happens on incoming trigger fires.
 */
export interface TrackTransition {
	/** Trigger key from the registry — `core.onPlayerRoll`, etc. */
	triggerKey: string;
	/** Source track this transition applies to. */
	fromTrackId: string;
	/** Zones, ordered by `startT`. Non-overlapping. */
	zones: TransitionZone[];
}

export interface OverlayTrack {
	id: string;
	name: string;
	durationMs: number;
	behavior: TrackBehavior;
	/** One lane per component on the overlay. Missing components hold their base style. */
	lanes: TrackComponentLane[];
}

/**
 * Container for the overlay's entire animation state. Stored on
 * `OverlayData.animation`. `initialTrackId` is the track the overlay enters
 * when first mounted; subsequent track changes come from transitions.
 */
export interface OverlayAnimationData {
	/** All tracks the overlay can be in. Always at least one. */
	tracks: OverlayTrack[];
	/** Track to enter on mount. Must reference a `tracks[*].id`. */
	initialTrackId: string;
	/** Event-trigger-driven transitions. Empty when the overlay has only one track. */
	transitions: TrackTransition[];
}

// ─── factories / helpers ─────────────────────────────────────────────────────

export function makeEmptyTrack(id: string, name = 'Idle'): OverlayTrack {
	return {
		id,
		name,
		durationMs: 0,
		behavior: { type: 'static' },
		lanes: [],
	};
}

export function makeEmptyAnimation(initialTrackId: string): OverlayAnimationData {
	return {
		tracks: [makeEmptyTrack(initialTrackId)],
		initialTrackId,
		transitions: [],
	};
}

/**
 * Find the active zone for a (transition, playhead) pair. Returns undefined
 * when the playhead falls outside every authored zone — the runtime treats
 * that case as "no transition applies."
 */
export function findActiveZone(transition: TrackTransition, playheadT: number): TransitionZone | undefined {
	for (const z of transition.zones) {
		if (playheadT >= z.startT && playheadT < z.endT) return z;
	}
	return undefined;
}

// ─── D1: per-property keyframe access ────────────────────────────────────────

/**
 * Read the per-property keyframe arrays for a lane, merging the legacy
 * `keyframes` field on the fly. Does not mutate the lane.
 *
 * Migration semantics: if the lane has `propertyKeyframes` already, those take
 * precedence per-property over anything in `keyframes`. Properties missing from
 * both sources return an empty array.
 */
export function lanePropertyKeyframes(
	lane: TrackComponentLane,
): Record<AnimatablePropertyKey, PropertyKeyframe[]> {
	const result: Record<AnimatablePropertyKey, PropertyKeyframe[]> = {
		opacity: [], x: [], y: [], rotation: [], scaleX: [], scaleY: [],
	};

	// Merge from legacy keyframes first (lower priority).
	for (const kf of lane.keyframes) {
		for (const prop of ANIMATABLE_PROPERTIES) {
			const v = kf[prop as keyof TrackKeyframe] as number | undefined;
			if (v !== undefined) {
				result[prop].push({ t: kf.t, v });
			}
		}
	}

	// Per-property arrays override: replace entries from the explicit map.
	if (lane.propertyKeyframes) {
		for (const prop of ANIMATABLE_PROPERTIES) {
			const arr = lane.propertyKeyframes[prop];
			if (arr && arr.length > 0) {
				result[prop] = [...arr].sort((a, b) => a.t - b.t);
			}
		}
	}

	// Sort each property array by t.
	for (const prop of ANIMATABLE_PROPERTIES) {
		result[prop].sort((a, b) => a.t - b.t);
	}

	return result;
}

/**
 * Ensure the `propertyKeyframes` map exists on a lane, initialising it when
 * absent. Mutates the lane in place; callers are expected to commit afterwards.
 */
export function ensurePropertyKeyframes(lane: TrackComponentLane): Required<TrackComponentLane>['propertyKeyframes'] {
	if (!lane.propertyKeyframes) lane.propertyKeyframes = {};
	return lane.propertyKeyframes;
}

/**
 * Insert a `PropertyKeyframe` into a property row, deduplicating by time
 * (last write wins). Returns the index of the new/updated keyframe after sort.
 */
export function insertPropertyKeyframe(
	lane: TrackComponentLane,
	prop: AnimatablePropertyKey,
	kf: PropertyKeyframe,
): number {
	const map = ensurePropertyKeyframes(lane);
	if (!map[prop]) map[prop] = [];
	const arr = map[prop]!;
	// Remove duplicate at same time (D2 compatibility — no stacking).
	const dupeIdx = arr.findIndex(k => k.t === kf.t);
	if (dupeIdx >= 0) arr.splice(dupeIdx, 1);
	arr.push(kf);
	arr.sort((a, b) => a.t - b.t);
	return arr.findIndex(k => k === kf);
}

/**
 * Remove a `PropertyKeyframe` by index from a property row.
 */
export function removePropertyKeyframe(
	lane: TrackComponentLane,
	prop: AnimatablePropertyKey,
	index: number,
): void {
	const arr = lane.propertyKeyframes?.[prop];
	if (!arr || index < 0 || index >= arr.length) return;
	arr.splice(index, 1);
}

/**
 * Update a `PropertyKeyframe` and re-sort. Returns the new index.
 */
export function updatePropertyKeyframe(
	lane: TrackComponentLane,
	prop: AnimatablePropertyKey,
	index: number,
	patch: Partial<PropertyKeyframe>,
): number {
	const arr = lane.propertyKeyframes?.[prop];
	if (!arr) return -1;
	const kf = arr[index];
	if (!kf) return -1;
	Object.assign(kf, patch);
	arr.sort((a, b) => a.t - b.t);
	return arr.findIndex(k => k === kf);
}

/**
 * Collect all unique keyframe times across ALL property rows on a lane.
 * Used to render the aggregated header markers in the timeline (D1).
 */
export function laneAggregateTimes(lane: TrackComponentLane): number[] {
	const set = new Set<number>();
	// Legacy keyframes.
	for (const kf of lane.keyframes) set.add(kf.t);
	// Per-property keyframes.
	if (lane.propertyKeyframes) {
		for (const prop of ANIMATABLE_PROPERTIES) {
			for (const kf of lane.propertyKeyframes[prop] ?? []) set.add(kf.t);
		}
	}
	return [...set].sort((a, b) => a - b);
}

// ─── D6: easing application ───────────────────────────────────────────────────

/**
 * Apply easing to an interpolation factor u ∈ [0, 1].
 * Only 'bezier' interpolation applies a curve; 'constant' and 'linear' are
 * handled by the caller.
 */
export function applyEasingV2(easing: EasingV2 | undefined, u: number): number {
	if (!easing || easing.interpolation === 'linear') return u;
	if (easing.interpolation === 'constant') return 0; // caller snaps to prev value
	// bezier
	const eq = easing.equation ?? 'sinusoidal';
	const dir = easing.direction ?? 'auto';
	return applyEquation(eq, dir, u);
}

function applyEquation(eq: EasingEquation, dir: EasingDirection, u: number): number {
	// Map direction to in/out/inout; 'auto' → 'inout' for most equations.
	const resolved = dir === 'auto' ? 'inout' : dir;

	switch (eq) {
		case 'sinusoidal': return easeSine(resolved, u);
		case 'quadratic': return easePoly(resolved, 2, u);
		case 'cubic': return easePoly(resolved, 3, u);
		case 'quartic': return easePoly(resolved, 4, u);
		case 'quintic': return easePoly(resolved, 5, u);
		case 'exponential': return easeExpo(resolved, u);
		case 'circular': return easeCirc(resolved, u);
		case 'back': return easeBack(resolved, u);
		case 'bounce': return easeBounce(resolved, u);
		case 'elastic': return easeElastic(resolved, u);
		default: return u;
	}
}

function easeSine(dir: 'in' | 'out' | 'inout', u: number): number {
	switch (dir) {
		case 'in': return 1 - Math.cos((u * Math.PI) / 2);
		case 'out': return Math.sin((u * Math.PI) / 2);
		case 'inout': return -(Math.cos(Math.PI * u) - 1) / 2;
	}
}

function easePoly(dir: 'in' | 'out' | 'inout', exp: number, u: number): number {
	switch (dir) {
		case 'in': return Math.pow(u, exp);
		case 'out': return 1 - Math.pow(1 - u, exp);
		case 'inout':
			return u < 0.5
				? Math.pow(2, exp - 1) * Math.pow(u, exp)
				: 1 - Math.pow(-2 * u + 2, exp) / 2;
	}
}

function easeExpo(dir: 'in' | 'out' | 'inout', u: number): number {
	switch (dir) {
		case 'in': return u === 0 ? 0 : Math.pow(2, 10 * u - 10);
		case 'out': return u === 1 ? 1 : 1 - Math.pow(2, -10 * u);
		case 'inout':
			if (u === 0) return 0;
			if (u === 1) return 1;
			return u < 0.5
				? Math.pow(2, 20 * u - 10) / 2
				: (2 - Math.pow(2, -20 * u + 10)) / 2;
	}
}

function easeCirc(dir: 'in' | 'out' | 'inout', u: number): number {
	switch (dir) {
		case 'in': return 1 - Math.sqrt(1 - Math.pow(u, 2));
		case 'out': return Math.sqrt(1 - Math.pow(u - 1, 2));
		case 'inout':
			return u < 0.5
				? (1 - Math.sqrt(1 - Math.pow(2 * u, 2))) / 2
				: (Math.sqrt(1 - Math.pow(-2 * u + 2, 2)) + 1) / 2;
	}
}

function easeBack(dir: 'in' | 'out' | 'inout', u: number): number {
	const c1 = 1.70158;
	const c2 = c1 * 1.525;
	const c3 = c1 + 1;
	switch (dir) {
		case 'in': return c3 * u * u * u - c1 * u * u;
		case 'out': return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
		case 'inout':
			return u < 0.5
				? (Math.pow(2 * u, 2) * ((c2 + 1) * 2 * u - c2)) / 2
				: (Math.pow(2 * u - 2, 2) * ((c2 + 1) * (2 * u - 2) + c2) + 2) / 2;
	}
}

function easeBounce(dir: 'in' | 'out' | 'inout', u: number): number {
	function bounceOut(t: number): number {
		const n1 = 7.5625, d1 = 2.75;
		if (t < 1 / d1) return n1 * t * t;
		if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
		if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
		t -= 2.625 / d1;
		return n1 * t * t + 0.984375;
	}
	switch (dir) {
		case 'in': return 1 - bounceOut(1 - u);
		case 'out': return bounceOut(u);
		case 'inout':
			return u < 0.5
				? (1 - bounceOut(1 - 2 * u)) / 2
				: (1 + bounceOut(2 * u - 1)) / 2;
	}
}

function easeElastic(dir: 'in' | 'out' | 'inout', u: number): number {
	const c4 = (2 * Math.PI) / 3;
	const c5 = (2 * Math.PI) / 4.5;
	switch (dir) {
		case 'in':
			if (u === 0) return 0;
			if (u === 1) return 1;
			return -Math.pow(2, 10 * u - 10) * Math.sin((u * 10 - 10.75) * c4);
		case 'out':
			if (u === 0) return 0;
			if (u === 1) return 1;
			return Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * c4) + 1;
		case 'inout':
			if (u === 0) return 0;
			if (u === 1) return 1;
			return u < 0.5
				? -(Math.pow(2, 20 * u - 10) * Math.sin((20 * u - 11.125) * c5)) / 2
				: (Math.pow(2, -20 * u + 10) * Math.sin((20 * u - 11.125) * c5)) / 2 + 1;
	}
}

// ─── interpolation for per-property keyframes ─────────────────────────────────

export const PROP_DEFAULTS: Record<AnimatablePropertyKey, number> = {
	opacity: 1, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
};

/**
 * Interpolate a single-property keyframe array to a scalar value at time `t`.
 */
export function interpPropertyKeyframes(
	keyframes: PropertyKeyframe[],
	prop: AnimatablePropertyKey,
	t: number,
): number {
	const base = PROP_DEFAULTS[prop];
	if (keyframes.length === 0) return base;
	const sorted = [...keyframes].sort((a, b) => a.t - b.t);
	if (t <= sorted[0].t) return sorted[0].v;
	const last = sorted[sorted.length - 1];
	if (t >= last.t) return last.v;
	for (let i = 0; i < sorted.length - 1; i++) {
		const a = sorted[i];
		const b = sorted[i + 1];
		if (t >= a.t && t < b.t) {
			const easing = b.easing ?? DEFAULT_EASING_V2;
			if (easing.interpolation === 'constant') return a.v;
			const rawU = (t - a.t) / (b.t - a.t);
			const u = applyEasingV2(easing, rawU);
			return a.v + (b.v - a.v) * u;
		}
	}
	return last.v;
}

/**
 * Linear interpolation helpers used by the renderer when resolving a
 * component's current opacity + transform at a given playhead time. Exposed
 * here so tests can exercise them without standing up the renderer.
 */
export function interpKeyframes(
	keyframes: TrackKeyframe[],
	t: number,
): { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number } {
	const base = { opacity: 1, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
	if (keyframes.length === 0) return base;
	// Sort defensively in case callers pass unsorted arrays.
	const sorted = [...keyframes].sort((a, b) => a.t - b.t);
	// Before first keyframe — hold first.
	if (t <= sorted[0].t) return applyKeyframe(base, sorted[0]);
	// After last keyframe — hold last.
	if (t >= sorted[sorted.length - 1].t) {
		let acc = base;
		for (const kf of sorted) acc = applyKeyframe(acc, kf);
		return acc;
	}
	// Walk forward, accumulating defined fields, and interpolate between the
	// pair bracketing `t`.
	let acc = base;
	for (let i = 0; i < sorted.length - 1; i++) {
		const a = sorted[i];
		const b = sorted[i + 1];
		if (t < a.t) break;
		acc = applyKeyframe(acc, a);
		if (t < b.t) {
			const u = (t - a.t) / (b.t - a.t);
			return interpPair(acc, applyKeyframe(acc, b), u);
		}
	}
	return acc;
}

function applyKeyframe(
	prev: { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number },
	kf: TrackKeyframe,
) {
	return {
		opacity: kf.opacity ?? prev.opacity,
		x: kf.x ?? prev.x,
		y: kf.y ?? prev.y,
		rotation: kf.rotation ?? prev.rotation,
		scaleX: kf.scaleX ?? prev.scaleX,
		scaleY: kf.scaleY ?? prev.scaleY,
	};
}

function interpPair(
	a: { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number },
	b: { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number },
	u: number,
) {
	const lerp = (p: number, q: number) => p + (q - p) * u;
	return {
		opacity: lerp(a.opacity, b.opacity),
		x: lerp(a.x, b.x),
		y: lerp(a.y, b.y),
		rotation: lerp(a.rotation, b.rotation),
		scaleX: lerp(a.scaleX, b.scaleX),
		scaleY: lerp(a.scaleY, b.scaleY),
	};
}

// ─── lane / keyframe mutation helpers ────────────────────────────────────────

/**
 * Find or create the lane for a given component on a track. The lane reference
 * is mutated into place if missing; caller is expected to commit afterwards.
 */
export function ensureLane(track: OverlayTrack, componentId: string): TrackComponentLane {
	const existing = track.lanes.find(l => l.componentId === componentId);
	if (existing) return existing;
	const lane: TrackComponentLane = { componentId, keyframes: [] };
	track.lanes.push(lane);
	return lane;
}

/**
 * Insert a keyframe sorted by time. Returns its post-insertion index so
 * callers can re-select it after re-render.
 */
export function insertKeyframeOnLane(lane: TrackComponentLane, kf: TrackKeyframe): number {
	// D2: collapse duplicates at the same time. Stacking two keyframes at the
	// same timestamp was previously possible and is never useful — the new one
	// replaces the old.
	const dupeIdx = lane.keyframes.findIndex(k => k.t === kf.t);
	if (dupeIdx >= 0) lane.keyframes.splice(dupeIdx, 1);
	lane.keyframes.push(kf);
	lane.keyframes.sort((a, b) => a.t - b.t);
	return lane.keyframes.findIndex(k => k === kf);
}

export function removeKeyframeOnLane(lane: TrackComponentLane, index: number): void {
	if (index < 0 || index >= lane.keyframes.length) return;
	lane.keyframes.splice(index, 1);
}

/**
 * Apply a patch to a keyframe and re-sort if the time changed. Returns the new
 * index after sorting.
 */
export function updateKeyframeOnLane(
	lane: TrackComponentLane,
	index: number,
	patch: Partial<TrackKeyframe>,
): number {
	const kf = lane.keyframes[index];
	if (!kf) return -1;
	Object.assign(kf, patch);
	lane.keyframes.sort((a, b) => a.t - b.t);
	return lane.keyframes.findIndex(k => k === kf);
}

/**
 * Compute the per-component frame snapshot of a track at the given playhead
 * time. Pure: takes the track + playhead, returns one `ComponentFrame` per
 * component-id mentioned by any lane. Components without a lane are absent
 * from the returned map; the renderer treats them as identity (opacity 1, no
 * transform).
 *
 * Prefers `propertyKeyframes` over the legacy `keyframes` array when both
 * are present on a lane, so D1 data takes effect immediately without
 * migration overhead.
 */
export function computeTrackFrame(
	track: OverlayTrack,
	playheadT: number,
): Map<string, { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number }> {
	const out = new Map<string, { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number }>();
	// Static tracks render at their t=0 snapshot regardless of playhead.
	const evalT = track.behavior.type === 'static' ? 0 : playheadT;
	for (const lane of track.lanes) {
		// If lane has per-property keyframes, use those. Otherwise fall back to
		// the legacy mixed-keyframe interpolator for backward-compat.
		if (lane.propertyKeyframes && Object.keys(lane.propertyKeyframes).length > 0) {
			const pkf = lanePropertyKeyframes(lane);
			out.set(lane.componentId, {
				opacity: interpPropertyKeyframes(pkf.opacity, 'opacity', evalT),
				x: interpPropertyKeyframes(pkf.x, 'x', evalT),
				y: interpPropertyKeyframes(pkf.y, 'y', evalT),
				rotation: interpPropertyKeyframes(pkf.rotation, 'rotation', evalT),
				scaleX: interpPropertyKeyframes(pkf.scaleX, 'scaleX', evalT),
				scaleY: interpPropertyKeyframes(pkf.scaleY, 'scaleY', evalT),
			});
		} else {
			out.set(lane.componentId, interpKeyframes(lane.keyframes, evalT));
		}
	}
	return out;
}
