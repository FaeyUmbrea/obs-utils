import type { CameraKeyframe, CameraPreset } from './cameraPresets.ts';
import { generateId } from './types.ts';

/**
 * Return a new sorted copy of the keyframes array. Keyframes are always
 * displayed and stored in ascending time order so the GSAP runtime can
 * iterate without re-sorting at playback time.
 */
export function sortKeyframesByTime(keyframes: CameraKeyframe[]): CameraKeyframe[] {
	return [...keyframes].sort((a, b) => a.time - b.time);
}

/**
 * Insert a new keyframe into the list, keeping time order. Returns a new
 * array; the original is not mutated.
 */
export function insertKeyframe(keyframes: CameraKeyframe[], kf: CameraKeyframe): CameraKeyframe[] {
	return sortKeyframesByTime([...keyframes, kf]);
}

/**
 * Remove the keyframe at the given index (in the caller's current array order).
 * Returns a new array.
 */
export function removeKeyframeAt(keyframes: CameraKeyframe[], index: number): CameraKeyframe[] {
	const next = [...keyframes];
	next.splice(index, 1);
	return next;
}

/**
 * Replace the keyframe at `index` with `updated`. Re-sorts by time so that
 * editing the time field keeps the array consistent.
 */
export function updateKeyframeAt(keyframes: CameraKeyframe[], index: number, updated: CameraKeyframe): CameraKeyframe[] {
	const next = [...keyframes];
	next[index] = updated;
	return sortKeyframesByTime(next);
}

/** Max keyframe time in ms, or 0 when the list is empty. */
export function maxKeyframeTime(keyframes: CameraKeyframe[]): number {
	if (keyframes.length === 0) return 0;
	return Math.max(...keyframes.map(k => k.time));
}

/**
 * Convert a legacy single-waypoint preset into a keyframed one. Seeds two
 * keyframes: the original position at t=0 and the same position at t=2000ms
 * so the user immediately has something to manipulate.
 */
export function convertLegacyPreset(preset: CameraPreset): CameraPreset {
	return {
		...preset,
		keyframes: [
			{ time: 0, x: preset.x, y: preset.y, scale: preset.scale, easing: 'easeInOut' },
			{ time: 2000, x: preset.x, y: preset.y, scale: preset.scale, easing: 'easeInOut' },
		],
		loop: preset.loop ?? 'none',
	};
}

/** Build a fresh keyframe from a viewport capture at a given playhead time. */
export function makeKeyframe(viewport: { x: number; y: number; scale: number }, timeMs: number): CameraKeyframe {
	return {
		time: timeMs,
		x: Math.round(viewport.x),
		y: Math.round(viewport.y),
		scale: viewport.scale,
		easing: 'easeInOut',
	};
}

// generateId re-exported so callers don't need a separate import.
export { generateId };
