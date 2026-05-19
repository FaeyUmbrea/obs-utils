import type { CameraPreset, EasingKind } from '../cameraPresets.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toGsapEase } from '../cameraPresets.ts';
import { playSequence } from '../cameraSequencePlayer.ts';
import { clampAndApplyExternal } from '../canvas.ts';

// ─── Module mocks ─────────────────────────────────────────────────────────────
// vi.mock calls are hoisted before all imports by Vitest, so these intercept
// module evaluation before any real module code runs.

vi.mock('../settings.ts', () => ({
	getSetting: vi.fn(),
	setSetting: vi.fn(),
}));

vi.mock('../canvas.ts', () => ({
	clampAndApplyExternal: vi.fn(),
}));

vi.mock('../obs.ts', () => ({}));
vi.mock('../defaultOverlays.ts', () => ({ getExampleOverlay: vi.fn(() => []) }));

vi.mock('gsap/CustomEase', () => ({
	CustomEase: {
		create: vi.fn((id: string, _data: string) => `custom:${id}`),
		register: vi.fn(),
	},
}));

const mockTimeline = {
	to: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
	kill: vi.fn(),
	pause: vi.fn().mockReturnThis(),
	resume: vi.fn().mockReturnThis(),
	seek: vi.fn().mockReturnThis(),
	duration: vi.fn().mockReturnValue(2),
	isActive: vi.fn().mockReturnValue(true),
};

vi.mock('gsap', () => ({
	default: {
		timeline: vi.fn(() => mockTimeline),
		registerPlugin: vi.fn(),
	},
}));

// ─── toGsapEase ───────────────────────────────────────────────────────────────

describe('toGsapEase', () => {
	it('maps easeIn to power1.in', () => {
		expect(toGsapEase('easeIn')).toBe('power1.in');
	});

	it('maps easeOut to power1.out', () => {
		expect(toGsapEase('easeOut')).toBe('power1.out');
	});

	it('maps easeInOut to power1.inOut', () => {
		expect(toGsapEase('easeInOut')).toBe('power1.inOut');
	});

	it('passes GSAP-native names through unchanged', () => {
		expect(toGsapEase('power2.in')).toBe('power2.in');
		expect(toGsapEase('sine.out')).toBe('sine.out');
		expect(toGsapEase('back.inOut')).toBe('back.inOut');
		expect(toGsapEase('linear')).toBe('linear');
	});

	it('delegates cubicBezier objects to CustomEase.create', () => {
		const ease: EasingKind = { cubicBezier: [0.25, 0.1, 0.25, 1] };
		const result = toGsapEase(ease);
		expect(typeof result === 'string' && result.startsWith('custom:')).toBe(true);
	});

	it('produces a deterministic id for the same cubic-bezier values', () => {
		const ease1: EasingKind = { cubicBezier: [0.42, 0, 0.58, 1] };
		const ease2: EasingKind = { cubicBezier: [0.42, 0, 0.58, 1] };
		const a = toGsapEase(ease1) as string;
		const b = toGsapEase(ease2) as string;
		expect(a).toBe(b);
	});
});

// ─── playSequence ─────────────────────────────────────────────────────────────

describe('playSequence', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTimeline.to.mockReturnThis();
		mockTimeline.set.mockReturnThis();
		mockTimeline.pause.mockReturnThis();
		mockTimeline.resume.mockReturnThis();
		mockTimeline.seek.mockReturnThis();
		mockTimeline.duration.mockReturnValue(2);
		mockTimeline.isActive.mockReturnValue(true);
	});

	it('applies x/y/scale immediately for a legacy single-waypoint preset', () => {
		const preset: CameraPreset = { id: 'a', name: 'A', x: 100, y: 200, scale: 1.5 };
		playSequence(preset);
		expect(clampAndApplyExternal).toHaveBeenCalledOnce();
		expect(clampAndApplyExternal).toHaveBeenCalledWith({ x: 100, y: 200, scale: 1.5 });
	});

	it('returns a no-op controller for a legacy preset', () => {
		const preset: CameraPreset = { id: 'b', name: 'B', x: 0, y: 0, scale: 1 };
		const ctrl = playSequence(preset);
		expect(ctrl.duration()).toBe(0);
		expect(ctrl.isPlaying()).toBe(false);
		ctrl.stop();
		ctrl.pause();
		ctrl.resume();
		ctrl.scrub(500);
	});

	it('returns a no-op controller for a preset with an empty keyframes array', () => {
		const preset: CameraPreset = { id: 'c', name: 'C', x: 10, y: 20, scale: 1, keyframes: [] };
		const ctrl = playSequence(preset);
		expect(ctrl.duration()).toBe(0);
	});

	it('builds a timeline with one to() call for a two-keyframe preset', () => {
		const preset: CameraPreset = {
			id: 'd',
			name: 'D',
			x: 0,
			y: 0,
			scale: 1,
			keyframes: [
				{ time: 0, x: 100, y: 100, scale: 1, easing: 'linear' },
				{ time: 2000, x: 500, y: 300, scale: 2, easing: 'easeOut' },
			],
		};
		playSequence(preset);
		expect(mockTimeline.to).toHaveBeenCalledOnce();
		const [, tweenVars] = mockTimeline.to.mock.calls[0];
		expect(tweenVars.x).toBe(500);
		expect(tweenVars.y).toBe(300);
		expect(tweenVars.scale).toBe(2);
		expect(tweenVars.duration).toBeCloseTo(2);
		expect(tweenVars.ease).toBe('power1.out');
	});

	it('stops the timeline on SequenceController.stop()', () => {
		const preset: CameraPreset = {
			id: 'e',
			name: 'E',
			x: 0,
			y: 0,
			scale: 1,
			keyframes: [
				{ time: 0, x: 0, y: 0, scale: 1, easing: 'linear' },
				{ time: 1000, x: 200, y: 200, scale: 1.5, easing: 'linear' },
			],
		};
		const ctrl = playSequence(preset);
		ctrl.stop();
		expect(mockTimeline.kill).toHaveBeenCalledOnce();
		// Idempotent — second call must not throw
		ctrl.stop();
	});

	it('delegates pause/resume/scrub to the underlying timeline', () => {
		const preset: CameraPreset = {
			id: 'f',
			name: 'F',
			x: 0,
			y: 0,
			scale: 1,
			keyframes: [
				{ time: 0, x: 0, y: 0, scale: 1, easing: 'linear' },
				{ time: 3000, x: 900, y: 600, scale: 2, easing: 'linear' },
			],
		};
		const ctrl = playSequence(preset);
		ctrl.pause();
		expect(mockTimeline.pause).toHaveBeenCalledOnce();

		ctrl.resume();
		expect(mockTimeline.resume).toHaveBeenCalledOnce();

		ctrl.scrub(1500);
		expect(mockTimeline.seek).toHaveBeenCalledWith(1.5, true);
	});
});
