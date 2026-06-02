import type { CameraKeyframe, EasingKind } from './cameraPresets.ts';

export const RECORD_INTERVAL_MS = 33;
export const RECORD_DELTA_PX = 2;
export const RECORD_DELTA_SCALE = 0.005;
// RDP epsilon — perpendicular pixel distance below which a sample is
// considered redundant. 4 px on a 1080p map keeps the shape visually
// indistinguishable from the raw curve.
export const SIMPLIFY_EPSILON_PX = 4;
// Dedup window — adjacent samples within this many ms AND below the per-sample
// delta thresholds collapse into one.
export const DEDUP_MIN_DT_MS = 50;

export const NAMED_EASINGS: EasingKind[] = [
	'linear',
	'easeIn',
	'easeOut',
	'easeInOut',
	'power2.in',
	'power2.out',
	'power2.inOut',
	'sine.in',
	'sine.out',
	'sine.inOut',
	'back.in',
	'back.out',
	'back.inOut',
];

export function smoothBuffer(buf: CameraKeyframe[], windowSize: number): CameraKeyframe[] {
	if (windowSize <= 1 || buf.length <= 1) return buf;
	const half = Math.floor(windowSize / 2);
	const out: CameraKeyframe[] = [];
	for (let i = 0; i < buf.length; i++) {
		let sx = 0;
		let sy = 0;
		let ss = 0;
		let n = 0;
		for (let j = Math.max(0, i - half); j <= Math.min(buf.length - 1, i + half); j++) {
			sx += buf[j].x;
			sy += buf[j].y;
			ss += buf[j].scale;
			n++;
		}
		out.push({ ...buf[i], x: Math.round(sx / n), y: Math.round(sy / n), scale: ss / n });
	}
	return out;
}

/**
 * Two-pass decimation:
 *   1. Drop adjacent samples that barely moved within `minDtMs`.
 *   2. Ramer-Douglas-Peucker over (x, y) with `epsilonPx` perpendicular
 *      distance: keep only points that the chord between their kept
 *      neighbors can't approximate within tolerance.
 *
 * The result preserves the shape of the recorded path while dropping the
 * straight-line filler samples that bloat the keyframe list and slow down
 * the editor's inspector.
 */
export function simplifyKeyframes(buf: CameraKeyframe[], epsilonPx: number, minDtMs: number): CameraKeyframe[] {
	if (buf.length <= 2) return buf;
	const dedup: CameraKeyframe[] = [buf[0]];
	for (let i = 1; i < buf.length; i++) {
		const last = dedup[dedup.length - 1];
		const cur = buf[i];
		const dt = cur.time - last.time;
		const moved = Math.hypot(cur.x - last.x, cur.y - last.y) > epsilonPx
			|| Math.abs(cur.scale - last.scale) > 0.01;
		if (dt < minDtMs && !moved) continue;
		dedup.push(cur);
	}
	// Always include the last raw sample so the recording's end frame is preserved.
	if (dedup[dedup.length - 1] !== buf[buf.length - 1]) dedup.push(buf[buf.length - 1]);
	if (dedup.length <= 2) return dedup;
	return rdpSimplify(dedup, epsilonPx);
}

export function rdpSimplify(buf: CameraKeyframe[], epsilon: number): CameraKeyframe[] {
	if (buf.length <= 2) return buf;
	let maxDist = 0;
	let maxIdx = 0;
	const first = buf[0];
	const last = buf[buf.length - 1];
	for (let i = 1; i < buf.length - 1; i++) {
		const d = perpDistance(buf[i], first, last);
		if (d > maxDist) {
			maxDist = d;
			maxIdx = i;
		}
	}
	if (maxDist > epsilon) {
		const left = rdpSimplify(buf.slice(0, maxIdx + 1), epsilon);
		const right = rdpSimplify(buf.slice(maxIdx), epsilon);
		return [...left.slice(0, -1), ...right];
	}
	return [first, last];
}

export function perpDistance(p: CameraKeyframe, a: CameraKeyframe, b: CameraKeyframe): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len = Math.hypot(dx, dy);
	if (len < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
	return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}
