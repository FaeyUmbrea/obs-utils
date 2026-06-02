import type { CameraKeyframe, EasingKind } from '../../../utils/cameraPresets.ts';
import {
	DEDUP_MIN_DT_MS,
	RECORD_DELTA_PX,
	RECORD_DELTA_SCALE,
	RECORD_INTERVAL_MS,
	SIMPLIFY_EPSILON_PX,
	simplifyKeyframes,
	smoothBuffer,
} from '../../../utils/animationPresetRecording.ts';
import { maxKeyframeTime, sortKeyframesByTime } from '../../../utils/cameraKeyframeOps.ts';

export interface RecordingContext {
	/** Reads the user's current local viewport (x, y, scale). Null if unavailable. */
	getViewport: () => { x: number; y: number; scale: number } | null;
	/** Snapshot of the current keyframes (already sorted). */
	getKeyframes: () => CameraKeyframe[];
	/** Read/write the timeline playhead. The controller advances this during sampling. */
	getPlayheadMs: () => number;
	setPlayheadMs: (ms: number) => void;
	/** Read/write composition duration. Used for the duration-locked end-of-recording cutoff. */
	getTotalMs: () => number;
	setTotalMs: (ms: number) => void;
	/** Reads the smoothing window size from the parent. */
	getSmoothingWindow: () => number;
	/** Reads the parent's duration-locked toggle. */
	getDurationLocked: () => boolean;
	/** Constant: padding added past last keyframe when growing the canvas. */
	timelinePaddingMs: number;
	/** Commits the new keyframes array to the preset. */
	onKeyframesCommit: (next: CameraKeyframe[]) => void;
}

export class RecordingController {
	/** True while sampling (not during the countdown). Bound by the toolbar's record button. */
	recording = $state(false);
	/** 3 → 2 → 1 → 0 (GO) → null. Drives the toolbar's countdown overlay. */
	countdown = $state<number | null>(null);
	/** Wall-clock ms since sampling started. Drives the timeline's progress fill. */
	recordElapsedMs = $state(0);
	/** Timeline ms at which sampling started (anchor for the recording window). */
	recordStartTimelineMs = $state(0);

	#ctx: RecordingContext;
	#recordSampleTimerId: ReturnType<typeof setInterval> | null = null;
	#countdownTimerId: ReturnType<typeof setTimeout> | null = null;
	#recordRafId: number | null = null;
	#recordStartWall = 0;
	#recordBuffer: CameraKeyframe[] = [];

	constructor(ctx: RecordingContext) {
		this.#ctx = ctx;
	}

	start(): void {
		// Anchor at the current playhead so the recording overwrites the area
		// of the timeline the user has scrubbed to.
		this.recordStartTimelineMs = this.#ctx.getPlayheadMs();
		this.#recordBuffer = [];
		this.recordElapsedMs = 0;

		// Countdown: show 3 → 2 → 1 → 0 (GO) at 1 s intervals, then begin.
		this.countdown = 3;
		const tick = () => {
			if (this.countdown === null) return;
			if (this.countdown > 1) {
				this.countdown -= 1;
				this.#countdownTimerId = setTimeout(tick, 1000);
			} else if (this.countdown === 1) {
				this.countdown = 0;
				this.#countdownTimerId = setTimeout(() => {
					this.countdown = null;
					this.#beginSampling();
				}, 600);
			}
		};
		this.#countdownTimerId = setTimeout(tick, 1000);
	}

	stop(): void {
		if (this.#countdownTimerId !== null) {
			clearTimeout(this.#countdownTimerId);
			this.#countdownTimerId = null;
		}
		if (this.#recordSampleTimerId !== null) {
			clearInterval(this.#recordSampleTimerId);
			this.#recordSampleTimerId = null;
		}
		if (this.#recordRafId !== null) {
			cancelAnimationFrame(this.#recordRafId);
			this.#recordRafId = null;
		}
		const wasRecording = this.recording;
		this.recording = false;
		this.countdown = null;
		if (!wasRecording || this.#recordBuffer.length === 0) {
			this.#recordBuffer = [];
			return;
		}

		const smoothed = smoothBuffer(this.#recordBuffer, this.#ctx.getSmoothingWindow());
		const simplified = simplifyKeyframes(smoothed, SIMPLIFY_EPSILON_PX, DEDUP_MIN_DT_MS);
		const recordEndMs = this.recordStartTimelineMs + (simplified[simplified.length - 1]?.time ?? 0);

		// Replace existing keyframes inside the recorded window with the new
		// (sparse, simplified) set. Keyframes outside the window are kept verbatim.
		const keyframes = this.#ctx.getKeyframes();
		const outsideRange = keyframes.filter(k => k.time < this.recordStartTimelineMs || k.time > recordEndMs);
		const offsetted = simplified.map(k => ({ ...k, time: k.time + this.recordStartTimelineMs, easing: 'linear' as EasingKind }));
		const next = sortKeyframesByTime([...outsideRange, ...offsetted]);
		this.#recordBuffer = [];

		// Duration lock: when on, never grow the canvas — any keyframes past
		// totalMs are dropped silently. The user opted in to a fixed window;
		// honor it. When off, bump totalMs to fit so the recording is fully
		// visible.
		if (!this.#ctx.getDurationLocked()) {
			const newMax = maxKeyframeTime(next);
			if (newMax + this.#ctx.timelinePaddingMs > this.#ctx.getTotalMs()) {
				this.#ctx.setTotalMs(newMax + this.#ctx.timelinePaddingMs);
			}
		}
		this.#ctx.onKeyframesCommit(next);
	}

	dispose(): void {
		this.stop();
	}

	#beginSampling(): void {
		this.recording = true;
		this.#recordStartWall = performance.now();
		// Force a sample at t=0 so the recording always anchors on the
		// starting frame. setInterval's first tick lands one interval later,
		// which used to leave a ~33 ms gap before the first keyframe.
		this.#sampleViewport();
		this.#recordSampleTimerId = setInterval(() => this.#sampleViewport(), RECORD_INTERVAL_MS);

		// rAF loop drives playhead + progress fill at display refresh rate so
		// the UI feels smooth even though sampling runs at ~30 Hz.
		const loop = () => {
			if (!this.recording) {
				this.#recordRafId = null;
				return;
			}
			this.recordElapsedMs = performance.now() - this.#recordStartWall;
			this.#ctx.setPlayheadMs(Math.min(this.#ctx.getTotalMs(), this.recordStartTimelineMs + this.recordElapsedMs));
			// Locked recording stops automatically when the playhead reaches
			// the composition end — the rAF loop is also the cleanest place to
			// detect that boundary since recordElapsedMs is updated here.
			if (this.#ctx.getDurationLocked() && this.recordStartTimelineMs + this.recordElapsedMs >= this.#ctx.getTotalMs()) {
				this.stop();
				return;
			}
			this.#recordRafId = requestAnimationFrame(loop);
		};
		this.#recordRafId = requestAnimationFrame(loop);
	}

	#sampleViewport(): void {
		const vp = this.#ctx.getViewport();
		if (!vp) return;
		const t = Math.round(performance.now() - this.#recordStartWall);
		const last = this.#recordBuffer[this.#recordBuffer.length - 1];
		if (last) {
			const dx = Math.abs(vp.x - last.x);
			const dy = Math.abs(vp.y - last.y);
			const ds = Math.abs(vp.scale - last.scale);
			if (dx < RECORD_DELTA_PX && dy < RECORD_DELTA_PX && ds < RECORD_DELTA_SCALE) return;
		}
		this.#recordBuffer.push({ time: t, x: Math.round(vp.x), y: Math.round(vp.y), scale: vp.scale, easing: 'easeInOut' });
	}
}
