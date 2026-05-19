import type { CameraPreset } from './cameraPresets.ts';
import { toGsapEase } from './cameraPresets.ts';
import { clampAndApplyExternal } from './canvas.ts';
import gsap from './gsap.ts';

export interface SequenceController {
	/** Stop and dispose. Idempotent. */
	stop: () => void;
	/** Pause at current position. */
	pause: () => void;
	/** Resume from pause. */
	resume: () => void;
	/** Manually scrub to a specific time in ms (clamped to [0, duration]). */
	scrub: (timeMs: number) => void;
	/** Total duration in ms. */
	duration: () => number;
	/** True while the animation is actively playing. */
	isPlaying: () => boolean;
}

/** Stub returned when there is nothing to animate (legacy single-waypoint). */
function stubController(): SequenceController {
	return {
		stop: () => {},
		pause: () => {},
		resume: () => {},
		scrub: () => {},
		duration: () => 0,
		isPlaying: () => false,
	};
}

/**
 * Build a GSAP Timeline from a keyframed preset, advancing a viewport proxy
 * through each keyframe with the segment's easing applied. Calls
 * clampAndApplyExternal on every onUpdate tick.
 *
 * If keyframes is missing or empty, applies the single-waypoint immediately
 * and returns a no-op controller.
 */
export function playSequence(preset: CameraPreset): SequenceController {
	if (!preset.keyframes || preset.keyframes.length === 0) {
		clampAndApplyExternal({ x: preset.x, y: preset.y, scale: preset.scale });
		return stubController();
	}

	const keyframes = [...preset.keyframes].sort((a, b) => a.time - b.time);
	const first = keyframes[0];

	const proxy = { x: first.x, y: first.y, scale: first.scale };

	// Apply the first frame immediately so the camera doesn't sit on the old
	// position during the timeline's initial delay to frame 0.
	if (first.time > 0) {
		clampAndApplyExternal({ x: proxy.x, y: proxy.y, scale: proxy.scale });
	}

	const repeatVars: { repeat: number; yoyo?: boolean } = { repeat: 0 };
	if (preset.loop === 'restart') {
		repeatVars.repeat = -1;
	} else if (preset.loop === 'pingpong') {
		repeatVars.repeat = -1;
		repeatVars.yoyo = true;
	}

	const tl = gsap.timeline({ ...repeatVars, paused: false });

	// Each keyframe after the first defines a segment from the previous keyframe.
	let prev = first;
	for (let i = 1; i < keyframes.length; i++) {
		const kf = keyframes[i];
		const segDuration = (kf.time - prev.time) / 1000;
		if (segDuration <= 0) {
			// Zero-duration jump — set immediately without tweening.
			tl.set(proxy, { x: kf.x, y: kf.y, scale: kf.scale });
		} else {
			tl.to(proxy, {
				x: kf.x,
				y: kf.y,
				scale: kf.scale,
				duration: segDuration,
				ease: toGsapEase(kf.easing),
				onUpdate: () => clampAndApplyExternal({ x: proxy.x, y: proxy.y, scale: proxy.scale }),
			});
		}
		prev = kf;
	}

	return {
		stop: () => tl.kill(),
		pause: () => { tl.pause(); },
		resume: () => { tl.resume(); },
		scrub: (timeMs: number) => {
			const secs = Math.max(0, Math.min(timeMs / 1000, tl.duration()));
			tl.seek(secs, true);
		},
		duration: () => {
			// GSAP duration is in seconds; expose as ms to match the keyframe time unit.
			return tl.duration() * 1000;
		},
		isPlaying: () => tl.isActive(),
	};
}
