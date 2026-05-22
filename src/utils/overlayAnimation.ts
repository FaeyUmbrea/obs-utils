export type TransformAxis = 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY';

export type AnimatablePropertyKey = 'opacity' | 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY';

export const ANIMATABLE_PROPERTIES: AnimatablePropertyKey[] = [
	'opacity',
	'x',
	'y',
	'rotation',
	'scaleX',
	'scaleY',
];

export type EasingInterpolation = 'constant' | 'linear' | 'bezier';

export type EasingEquation
	= | 'sinusoidal' | 'quadratic' | 'cubic' | 'quartic' | 'quintic'
		| 'exponential' | 'circular' | 'back' | 'bounce' | 'elastic';

export type EasingDirection = 'in' | 'out' | 'inout' | 'auto';

export interface EasingV2 {
	interpolation: EasingInterpolation;
	equation?: EasingEquation;
	direction?: EasingDirection;
}

export const DEFAULT_EASING_V2: EasingV2 = {
	interpolation: 'bezier',
	equation: 'sinusoidal',
	direction: 'auto',
};

export const EQUATIONS: EasingEquation[] = [
	'sinusoidal',
	'quadratic',
	'cubic',
	'quartic',
	'quintic',
	'exponential',
	'circular',
	'back',
	'bounce',
	'elastic',
];

export const EQUATION_LABELS: Record<EasingEquation, string> = {
	sinusoidal: 'Sinusoidal',
	quadratic: 'Quadratic',
	cubic: 'Cubic',
	quartic: 'Quartic',
	quintic: 'Quintic',
	exponential: 'Exponential',
	circular: 'Circular',
	back: 'Back',
	bounce: 'Bounce',
	elastic: 'Elastic',
};

export const INTERP_LABELS: Record<EasingInterpolation, string> = {
	constant: 'Constant',
	linear: 'Linear',
	bezier: 'Bezier',
};

export const PROP_LABELS: Record<AnimatablePropertyKey, string> = {
	opacity: 'Opacity',
	x: 'X',
	y: 'Y',
	rotation: 'Rotation',
	scaleX: 'Scale X',
	scaleY: 'Scale Y',
};

export interface PropertyKeyframe {
	t: number;
	v: number;
	easing?: EasingV2;
}

// Legacy mixed-property shape — kept for back-compat with persisted data.
export interface TrackKeyframe {
	t: number;
	opacity?: number;
	x?: number;
	y?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	ease?: string;
}

export interface TrackComponentLane {
	componentId: string;
	keyframes: TrackKeyframe[];
	propertyKeyframes?: Partial<Record<AnimatablePropertyKey, PropertyKeyframe[]>>;
}

export type TrackBehavior
	= | { type: 'static' }
		| { type: 'looping' }
		| { type: 'transition-on-end'; toTrackId: string; toTime: number };

export type ZoneDestination
	= | { type: 'goto'; toTrackId: string; toTime: number }
		| { type: 'ignore' };

export interface TransitionZone {
	startT: number;
	endT: number;
	destination: ZoneDestination;
}

export interface TrackTransition {
	triggerKey: string;
	fromTrackId: string;
	zones: TransitionZone[];
}

export interface OverlayTrack {
	id: string;
	name: string;
	durationMs: number;
	behavior: TrackBehavior;
	lanes: TrackComponentLane[];
}

export interface OverlayAnimationData {
	tracks: OverlayTrack[];
	initialTrackId: string;
	transitions: TrackTransition[];
}

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

export function findActiveZone(transition: TrackTransition, playheadT: number): TransitionZone | undefined {
	for (const z of transition.zones) {
		if (playheadT >= z.startT && playheadT < z.endT) return z;
	}
	return undefined;
}

export function lanePropertyKeyframes(
	lane: TrackComponentLane,
): Record<AnimatablePropertyKey, PropertyKeyframe[]> {
	const result: Record<AnimatablePropertyKey, PropertyKeyframe[]> = {
		opacity: [],
		x: [],
		y: [],
		rotation: [],
		scaleX: [],
		scaleY: [],
	};

	for (const kf of lane.keyframes) {
		for (const prop of ANIMATABLE_PROPERTIES) {
			const v = kf[prop as keyof TrackKeyframe] as number | undefined;
			if (v !== undefined) {
				result[prop].push({ t: kf.t, v });
			}
		}
	}

	// propertyKeyframes overrides legacy values per-property.
	if (lane.propertyKeyframes) {
		for (const prop of ANIMATABLE_PROPERTIES) {
			const arr = lane.propertyKeyframes[prop];
			if (arr && arr.length > 0) {
				result[prop] = [...arr].sort((a, b) => a.t - b.t);
			}
		}
	}

	for (const prop of ANIMATABLE_PROPERTIES) {
		result[prop].sort((a, b) => a.t - b.t);
	}

	return result;
}

export function ensurePropertyKeyframes(lane: TrackComponentLane): Required<TrackComponentLane>['propertyKeyframes'] {
	if (!lane.propertyKeyframes) lane.propertyKeyframes = {};
	return lane.propertyKeyframes;
}

export function insertPropertyKeyframe(
	lane: TrackComponentLane,
	prop: AnimatablePropertyKey,
	kf: PropertyKeyframe,
): number {
	const map = ensurePropertyKeyframes(lane);
	if (!map[prop]) map[prop] = [];
	const arr = map[prop]!;
	const dupeIdx = arr.findIndex(k => k.t === kf.t);
	if (dupeIdx >= 0) arr.splice(dupeIdx, 1);
	arr.push(kf);
	arr.sort((a, b) => a.t - b.t);
	return arr.findIndex(k => k === kf);
}

export function removePropertyKeyframe(
	lane: TrackComponentLane,
	prop: AnimatablePropertyKey,
	index: number,
): void {
	const arr = lane.propertyKeyframes?.[prop];
	if (!arr || index < 0 || index >= arr.length) return;
	arr.splice(index, 1);
}

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

export function laneAggregateTimes(lane: TrackComponentLane): number[] {
	const set = new Set<number>();
	for (const kf of lane.keyframes) set.add(kf.t);
	if (lane.propertyKeyframes) {
		for (const prop of ANIMATABLE_PROPERTIES) {
			for (const kf of lane.propertyKeyframes[prop] ?? []) set.add(kf.t);
		}
	}
	return [...set].sort((a, b) => a - b);
}

export function applyEasingV2(easing: EasingV2 | undefined, u: number): number {
	if (!easing || easing.interpolation === 'linear') return u;
	if (easing.interpolation === 'constant') return 0; // caller snaps to prev value
	const eq = easing.equation ?? 'sinusoidal';
	const dir = easing.direction ?? 'auto';
	return applyEquation(eq, dir, u);
}

function applyEquation(eq: EasingEquation, dir: EasingDirection, u: number): number {
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
		case 'in': return u ** exp;
		case 'out': return 1 - (1 - u) ** exp;
		case 'inout':
			return u < 0.5
				? 2 ** (exp - 1) * u ** exp
				: 1 - (-2 * u + 2) ** exp / 2;
	}
}

function easeExpo(dir: 'in' | 'out' | 'inout', u: number): number {
	switch (dir) {
		case 'in': return u === 0 ? 0 : 2 ** (10 * u - 10);
		case 'out': return u === 1 ? 1 : 1 - 2 ** (-10 * u);
		case 'inout':
			if (u === 0) return 0;
			if (u === 1) return 1;
			return u < 0.5
				? 2 ** (20 * u - 10) / 2
				: (2 - 2 ** (-20 * u + 10)) / 2;
	}
}

function easeCirc(dir: 'in' | 'out' | 'inout', u: number): number {
	switch (dir) {
		case 'in': return 1 - Math.sqrt(1 - u ** 2);
		case 'out': return Math.sqrt(1 - (u - 1) ** 2);
		case 'inout':
			return u < 0.5
				? (1 - Math.sqrt(1 - (2 * u) ** 2)) / 2
				: (Math.sqrt(1 - (-2 * u + 2) ** 2) + 1) / 2;
	}
}

function easeBack(dir: 'in' | 'out' | 'inout', u: number): number {
	const c1 = 1.70158;
	const c2 = c1 * 1.525;
	const c3 = c1 + 1;
	switch (dir) {
		case 'in': return c3 * u * u * u - c1 * u * u;
		case 'out': return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2;
		case 'inout':
			return u < 0.5
				? ((2 * u) ** 2 * ((c2 + 1) * 2 * u - c2)) / 2
				: ((2 * u - 2) ** 2 * ((c2 + 1) * (2 * u - 2) + c2) + 2) / 2;
	}
}

function easeBounce(dir: 'in' | 'out' | 'inout', u: number): number {
	function bounceOut(t: number): number {
		const n1 = 7.5625;
		const d1 = 2.75;
		if (t < 1 / d1) return n1 * t * t;
		if (t < 2 / d1) {
			t -= 1.5 / d1;
			return n1 * t * t + 0.75;
		}
		if (t < 2.5 / d1) {
			t -= 2.25 / d1;
			return n1 * t * t + 0.9375;
		}
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
			return -(2 ** (10 * u - 10)) * Math.sin((u * 10 - 10.75) * c4);
		case 'out':
			if (u === 0) return 0;
			if (u === 1) return 1;
			return 2 ** (-10 * u) * Math.sin((u * 10 - 0.75) * c4) + 1;
		case 'inout':
			if (u === 0) return 0;
			if (u === 1) return 1;
			return u < 0.5
				? -(2 ** (20 * u - 10) * Math.sin((20 * u - 11.125) * c5)) / 2
				: (2 ** (-20 * u + 10) * Math.sin((20 * u - 11.125) * c5)) / 2 + 1;
	}
}

export const PROP_DEFAULTS: Record<AnimatablePropertyKey, number> = {
	opacity: 1,
	x: 0,
	y: 0,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
};

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

export function interpKeyframes(
	keyframes: TrackKeyframe[],
	t: number,
): { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number } {
	const base = { opacity: 1, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
	if (keyframes.length === 0) return base;
	const sorted = [...keyframes].sort((a, b) => a.t - b.t);
	if (t <= sorted[0].t) return applyKeyframe(base, sorted[0]);
	if (t >= sorted[sorted.length - 1].t) {
		let acc = base;
		for (const kf of sorted) acc = applyKeyframe(acc, kf);
		return acc;
	}
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

export function ensureLane(track: OverlayTrack, componentId: string): TrackComponentLane {
	const existing = track.lanes.find(l => l.componentId === componentId);
	if (existing) return existing;
	const lane: TrackComponentLane = { componentId, keyframes: [] };
	track.lanes.push(lane);
	return lane;
}

export function insertKeyframeOnLane(lane: TrackComponentLane, kf: TrackKeyframe): number {
	// Collapse duplicates at the same time — new one replaces the old.
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

export function computeTrackFrame(
	track: OverlayTrack,
	playheadT: number,
): Map<string, { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number }> {
	const out = new Map<string, { opacity: number; x: number; y: number; rotation: number; scaleX: number; scaleY: number }>();
	const evalT = track.behavior.type === 'static' ? 0 : playheadT;
	for (const lane of track.lanes) {
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
