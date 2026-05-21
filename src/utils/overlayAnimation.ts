/**
 * Overlay-level animation data model.
 *
 * An overlay has one or more **tracks**. Each track is a timeline of opacity +
 * transform changes for every component on the overlay. Event triggers cause
 * **transitions** between tracks. With one track there's nothing to transition
 * to, so triggers only matter once a second track exists.
 */

export type TransformAxis = 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY';

/**
 * One sample on a component's track at a specific time within the track.
 * The renderer linearly interpolates between adjacent keyframes (with optional
 * easing) to produce the per-frame opacity + transform values fed to the leaf.
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
 * Per-component track data. Keyframes are sorted ascending by `t`. A component
 * with no keyframes on a track is held at its base style — i.e. it renders
 * with opacity 1 and zero transform.
 */
export interface TrackComponentLane {
	/** Matches `OverlayComponentData.id`. */
	componentId: string;
	keyframes: TrackKeyframe[];
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

/**
 * Compute the per-component frame snapshot of a track at the given playhead
 * time. Pure: takes the track + playhead, returns one `ComponentFrame` per
 * component-id mentioned by any lane. Components without a lane are absent
 * from the returned map; the renderer treats them as identity (opacity 1, no
 * transform).
 */
export function computeTrackFrame(
	track: OverlayTrack,
	playheadT: number,
): Map<string, { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number }> {
	const out = new Map<string, { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number }>();
	// Static tracks render at their t=0 snapshot regardless of playhead.
	const evalT = track.behavior.type === 'static' ? 0 : playheadT;
	for (const lane of track.lanes) {
		out.set(lane.componentId, interpKeyframes(lane.keyframes, evalT));
	}
	return out;
}
