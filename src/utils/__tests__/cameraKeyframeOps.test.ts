import type { CameraKeyframe, CameraPreset } from '../cameraPresets.ts';
import { describe, expect, it, vi } from 'vitest';
import {
	convertLegacyPreset,
	insertKeyframe,
	makeKeyframe,
	maxKeyframeTime,
	removeKeyframeAt,
	sortKeyframesByTime,
	updateKeyframeAt,
} from '../cameraKeyframeOps.ts';

// ─── Module mocks ─────────────────────────────────────────────────────────────
// vi.mock calls are hoisted before all imports by Vitest, so these intercept
// module evaluation before any real module code runs.

vi.mock('../settings.ts', () => ({
	getSetting: vi.fn(),
	setSetting: vi.fn(),
	OBSAction: {},
}));

vi.mock('../obs.ts', () => ({}));
vi.mock('../defaultOverlays.ts', () => ({ getExampleOverlay: vi.fn(() => []) }));

vi.mock('gsap/CustomEase', () => ({
	CustomEase: { create: vi.fn((id: string) => `custom:${id}`), register: vi.fn() },
}));
vi.mock('gsap', () => ({
	default: { timeline: vi.fn(() => ({})), registerPlugin: vi.fn() },
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

function kf(time: number, x = 0, y = 0, scale = 1): CameraKeyframe {
	return { time, x, y, scale, easing: 'linear' };
}

// ─── sortKeyframesByTime ──────────────────────────────────────────────────────

describe('sortKeyframesByTime', () => {
	it('returns frames in ascending time order', () => {
		const sorted = sortKeyframesByTime([kf(3000), kf(0), kf(1000)]);
		expect(sorted.map(k => k.time)).toEqual([0, 1000, 3000]);
	});

	it('does not mutate the original array', () => {
		const original = [kf(2000), kf(500)];
		sortKeyframesByTime(original);
		expect(original[0].time).toBe(2000);
	});

	it('handles an empty array', () => {
		expect(sortKeyframesByTime([])).toEqual([]);
	});
});

// ─── insertKeyframe ───────────────────────────────────────────────────────────

describe('insertKeyframe', () => {
	it('inserts into the correct sorted position', () => {
		const result = insertKeyframe([kf(0), kf(2000)], kf(1000));
		expect(result.map(k => k.time)).toEqual([0, 1000, 2000]);
	});

	it('appends when time is largest', () => {
		const result = insertKeyframe([kf(0), kf(1000)], kf(3000));
		expect(result.map(k => k.time)).toEqual([0, 1000, 3000]);
	});

	it('prepends when time is smallest', () => {
		const result = insertKeyframe([kf(1000), kf(2000)], kf(0));
		expect(result.map(k => k.time)).toEqual([0, 1000, 2000]);
	});
});

// ─── removeKeyframeAt ─────────────────────────────────────────────────────────

describe('removeKeyframeAt', () => {
	it('removes the keyframe at the given index', () => {
		const result = removeKeyframeAt([kf(0), kf(1000), kf(2000)], 1);
		expect(result.map(k => k.time)).toEqual([0, 2000]);
	});

	it('removes the first keyframe', () => {
		const result = removeKeyframeAt([kf(0), kf(1000)], 0);
		expect(result.map(k => k.time)).toEqual([1000]);
	});

	it('does not mutate the original array', () => {
		const arr = [kf(0), kf(1000)];
		removeKeyframeAt(arr, 0);
		expect(arr.length).toBe(2);
	});
});

// ─── updateKeyframeAt ─────────────────────────────────────────────────────────

describe('updateKeyframeAt', () => {
	it('updates the keyframe at the given index', () => {
		const result = updateKeyframeAt([kf(0), kf(1000)], 1, kf(1500, 100, 200, 2));
		expect(result[1].time).toBe(1500);
		expect(result[1].x).toBe(100);
	});

	it('re-sorts by time after update', () => {
		// Moving the first keyframe to t=3000 should put it last.
		const result = updateKeyframeAt([kf(0), kf(2000)], 0, kf(3000));
		expect(result.map(k => k.time)).toEqual([2000, 3000]);
	});
});

// ─── maxKeyframeTime ──────────────────────────────────────────────────────────

describe('maxKeyframeTime', () => {
	it('returns the largest time', () => {
		expect(maxKeyframeTime([kf(0), kf(4500), kf(2000)])).toBe(4500);
	});

	it('returns 0 for an empty array', () => {
		expect(maxKeyframeTime([])).toBe(0);
	});
});

// ─── convertLegacyPreset ──────────────────────────────────────────────────────

describe('convertLegacyPreset', () => {
	const legacy: CameraPreset = { id: 'x', name: 'X', x: 100, y: 200, scale: 1.5 };

	it('seeds two keyframes', () => {
		const result = convertLegacyPreset(legacy);
		expect(result.keyframes?.length).toBe(2);
	});

	it('first keyframe is at t=0 with the legacy position', () => {
		const result = convertLegacyPreset(legacy);
		expect(result.keyframes![0]).toMatchObject({ time: 0, x: 100, y: 200, scale: 1.5 });
	});

	it('second keyframe is at t=2000 with the same position', () => {
		const result = convertLegacyPreset(legacy);
		expect(result.keyframes![1]).toMatchObject({ time: 2000, x: 100, y: 200, scale: 1.5 });
	});

	it('defaults loop to none', () => {
		const result = convertLegacyPreset(legacy);
		expect(result.loop).toBe('none');
	});

	it('preserves an existing loop mode', () => {
		const result = convertLegacyPreset({ ...legacy, loop: 'pingpong' });
		expect(result.loop).toBe('pingpong');
	});

	it('does not mutate the original preset', () => {
		convertLegacyPreset(legacy);
		expect(legacy.keyframes).toBeUndefined();
	});
});

// ─── makeKeyframe ─────────────────────────────────────────────────────────────

describe('makeKeyframe', () => {
	it('rounds x and y, preserves scale', () => {
		const kfResult = makeKeyframe({ x: 123.7, y: 456.2, scale: 0.75 }, 1000);
		expect(kfResult.x).toBe(124);
		expect(kfResult.y).toBe(456);
		expect(kfResult.scale).toBe(0.75);
	});

	it('sets the given time', () => {
		expect(makeKeyframe({ x: 0, y: 0, scale: 1 }, 3500).time).toBe(3500);
	});

	it('defaults to easeInOut', () => {
		expect(makeKeyframe({ x: 0, y: 0, scale: 1 }, 0).easing).toBe('easeInOut');
	});
});
