import type { AnimationState, AnimKeyframe, AnimReEntryPolicy, ComponentAnimationConfig, KeyframeAnimation } from './componentAnimation.ts';

/** Blank keyframe animation seeded with bookend frames at offset 0 and 1. */
export function makeKeyframeAnimation(): KeyframeAnimation {
	return {
		duration: 500,
		keyframes: [
			{ offset: 0, transform: '', opacity: 1, filter: '' },
			{ offset: 1, transform: '', opacity: 1, filter: '' },
		],
		loop: 'none',
		ease: 'linear',
	};
}

/** Fresh ComponentAnimationConfig with an empty default state. */
export function makeAnimationConfig(): ComponentAnimationConfig {
	return {
		defaultState: {},
		triggeredStates: {},
		reEntry: 'restart',
	};
}

/**
 * Sort an animation keyframe list by ascending offset. Returns a new array;
 * the original is not mutated.
 */
export function sortKeyframesByOffset(keyframes: AnimKeyframe[]): AnimKeyframe[] {
	return [...keyframes].sort((a, b) => a.offset - b.offset);
}

/**
 * Insert a new keyframe at the given offset, keeping the list sorted. Returns
 * a new array; the original is not mutated.
 */
export function insertAnimKeyframe(keyframes: AnimKeyframe[], kf: AnimKeyframe): AnimKeyframe[] {
	return sortKeyframesByOffset([...keyframes, kf]);
}

/**
 * Remove the keyframe at `index`. Refuses (returns the original array unchanged)
 * when the keyframe is a bookend (offset exactly 0 or 1) — every animation must
 * keep its start and end frames.
 */
export function removeAnimKeyframe(keyframes: AnimKeyframe[], index: number): { next: AnimKeyframe[]; refused: boolean } {
	const kf = keyframes[index];
	if (!kf || kf.offset === 0 || kf.offset === 1) {
		return { next: keyframes, refused: true };
	}
	const next = [...keyframes];
	next.splice(index, 1);
	return { next, refused: false };
}

/**
 * Replace the keyframe at `index` with `updated`. Re-sorts so editing the
 * offset field keeps the list consistent. Returns a new array.
 */
export function updateAnimKeyframeAt(keyframes: AnimKeyframe[], index: number, updated: AnimKeyframe): AnimKeyframe[] {
	const next = [...keyframes];
	next[index] = updated;
	return sortKeyframesByOffset(next);
}

/**
 * Ensure the keyframe list has exactly one frame at offset 0 and one at
 * offset 1, inserting defaults if absent. Returns a new array only if a
 * modification was needed.
 */
export function enforceKeyframeBookends(keyframes: AnimKeyframe[]): AnimKeyframe[] {
	const result = [...keyframes];
	if (!result.some(k => k.offset === 0)) {
		result.unshift({ offset: 0, transform: '', opacity: 1, filter: '' });
	}
	if (!result.some(k => k.offset === 1)) {
		result.push({ offset: 1, transform: '', opacity: 1, filter: '' });
	}
	return sortKeyframesByOffset(result);
}

/**
 * Add a triggered state for `eventKey` to the config. If the key already
 * exists the config is returned unchanged.
 */
export function addTriggeredState(
	config: ComponentAnimationConfig,
	eventKey: string,
): ComponentAnimationConfig {
	if (eventKey in config.triggeredStates) return config;
	return {
		...config,
		triggeredStates: { ...config.triggeredStates, [eventKey]: {} },
	};
}

/**
 * Remove a triggered state by `eventKey`. The default state is never removed
 * through this path.
 */
export function removeTriggeredState(
	config: ComponentAnimationConfig,
	eventKey: string,
): ComponentAnimationConfig {
	const next = { ...config.triggeredStates };
	delete next[eventKey];
	return { ...config, triggeredStates: next };
}

/** Apply a re-entry policy change to a config. */
export function setReEntryPolicy(
	config: ComponentAnimationConfig,
	policy: AnimReEntryPolicy,
): ComponentAnimationConfig {
	return { ...config, reEntry: policy };
}

/**
 * Set or replace one phase (entrance / steady / exit) on a given state.
 * Pass `undefined` to clear the phase.
 */
export function setAnimationPhase(
	state: AnimationState,
	phase: 'entrance' | 'steady' | 'exit',
	anim: KeyframeAnimation | undefined,
): AnimationState {
	return { ...state, [phase]: anim };
}

/** Extract all non-standard CSS property keys from a keyframe (keys other than offset, transform, opacity, filter). */
export function customPropertiesOf(kf: AnimKeyframe): string[] {
	return Object.keys(kf).filter(k => k !== 'offset' && k !== 'transform' && k !== 'opacity' && k !== 'filter');
}
