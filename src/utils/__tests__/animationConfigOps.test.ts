import type { AnimKeyframe, ComponentAnimationConfig } from '../componentAnimation.ts';
import { describe, expect, it } from 'vitest';
import {
	addTriggeredState,
	customPropertiesOf,
	enforceKeyframeBookends,
	insertAnimKeyframe,
	makeAnimationConfig,
	makeKeyframeAnimation,
	removeAnimKeyframe,
	removeTriggeredState,
	setAnimationPhase,
	setReEntryPolicy,
	sortKeyframesByOffset,
	updateAnimKeyframeAt,
} from '../animationConfigOps.ts';

// ─── helpers ──────────────────────────────────────────────────────────────────

function kf(offset: number, extra: Partial<AnimKeyframe> = {}): AnimKeyframe {
	return { offset, ...extra };
}

// ─── makeKeyframeAnimation ────────────────────────────────────────────────────

describe('makeKeyframeAnimation', () => {
	it('seeds bookend keyframes at offset 0 and 1', () => {
		const anim = makeKeyframeAnimation();
		expect(anim.keyframes.map(k => k.offset)).toEqual([0, 1]);
	});

	it('defaults duration to 500ms', () => {
		expect(makeKeyframeAnimation().duration).toBe(500);
	});

	it('defaults loop to none', () => {
		expect(makeKeyframeAnimation().loop).toBe('none');
	});

	it('defaults ease to linear', () => {
		expect(makeKeyframeAnimation().ease).toBe('linear');
	});
});

// ─── makeAnimationConfig ──────────────────────────────────────────────────────

describe('makeAnimationConfig', () => {
	it('starts with an empty default state', () => {
		const cfg = makeAnimationConfig();
		expect(cfg.defaultState).toEqual({});
	});

	it('starts with no triggered states', () => {
		expect(Object.keys(makeAnimationConfig().triggeredStates)).toHaveLength(0);
	});

	it('defaults re-entry to restart', () => {
		expect(makeAnimationConfig().reEntry).toBe('restart');
	});
});

// ─── sortKeyframesByOffset ────────────────────────────────────────────────────

describe('sortKeyframesByOffset', () => {
	it('sorts in ascending offset order', () => {
		const sorted = sortKeyframesByOffset([kf(1), kf(0), kf(0.5)]);
		expect(sorted.map(k => k.offset)).toEqual([0, 0.5, 1]);
	});

	it('does not mutate the original array', () => {
		const arr = [kf(1), kf(0)];
		sortKeyframesByOffset(arr);
		expect(arr[0].offset).toBe(1);
	});

	it('handles an empty array', () => {
		expect(sortKeyframesByOffset([])).toEqual([]);
	});
});

// ─── insertAnimKeyframe ───────────────────────────────────────────────────────

describe('insertAnimKeyframe', () => {
	it('inserts at the correct sorted position', () => {
		const result = insertAnimKeyframe([kf(0), kf(1)], kf(0.5));
		expect(result.map(k => k.offset)).toEqual([0, 0.5, 1]);
	});

	it('does not mutate the original array', () => {
		const arr = [kf(0), kf(1)];
		insertAnimKeyframe(arr, kf(0.5));
		expect(arr).toHaveLength(2);
	});
});

// ─── removeAnimKeyframe ───────────────────────────────────────────────────────

describe('removeAnimKeyframe', () => {
	it('removes a middle keyframe', () => {
		const { next, refused } = removeAnimKeyframe([kf(0), kf(0.5), kf(1)], 1);
		expect(refused).toBe(false);
		expect(next.map(k => k.offset)).toEqual([0, 1]);
	});

	it('refuses removal of a frame at offset 0', () => {
		const arr = [kf(0), kf(0.5), kf(1)];
		const { next, refused } = removeAnimKeyframe(arr, 0);
		expect(refused).toBe(true);
		expect(next).toBe(arr);
	});

	it('refuses removal of a frame at offset 1', () => {
		const arr = [kf(0), kf(0.5), kf(1)];
		const { next, refused } = removeAnimKeyframe(arr, 2);
		expect(refused).toBe(true);
		expect(next).toBe(arr);
	});

	it('does not mutate the original array', () => {
		const arr = [kf(0), kf(0.5), kf(1)];
		removeAnimKeyframe(arr, 1);
		expect(arr).toHaveLength(3);
	});
});

// ─── updateAnimKeyframeAt ─────────────────────────────────────────────────────

describe('updateAnimKeyframeAt', () => {
	it('updates the keyframe at the given index', () => {
		const result = updateAnimKeyframeAt([kf(0), kf(1)], 0, kf(0, { opacity: 0.5 }));
		expect(result[0].opacity).toBe(0.5);
	});

	it('re-sorts by offset after update', () => {
		const result = updateAnimKeyframeAt([kf(0), kf(0.5), kf(1)], 1, kf(0.8));
		expect(result.map(k => k.offset)).toEqual([0, 0.8, 1]);
	});
});

// ─── enforceKeyframeBookends ──────────────────────────────────────────────────

describe('enforceKeyframeBookends', () => {
	it('is a no-op when bookends already exist', () => {
		const arr = [kf(0), kf(0.5), kf(1)];
		const result = enforceKeyframeBookends(arr);
		expect(result.map(k => k.offset)).toEqual([0, 0.5, 1]);
	});

	it('inserts a leading 0 frame when missing', () => {
		const result = enforceKeyframeBookends([kf(0.5), kf(1)]);
		expect(result[0].offset).toBe(0);
	});

	it('inserts a trailing 1 frame when missing', () => {
		const result = enforceKeyframeBookends([kf(0), kf(0.5)]);
		expect(result[result.length - 1].offset).toBe(1);
	});

	it('inserts both bookends when the list is empty', () => {
		const result = enforceKeyframeBookends([]);
		expect(result.map(k => k.offset)).toEqual([0, 1]);
	});
});

// ─── addTriggeredState ────────────────────────────────────────────────────────

describe('addTriggeredState', () => {
	const base: ComponentAnimationConfig = makeAnimationConfig();

	it('adds a new key with an empty state', () => {
		const result = addTriggeredState(base, 'core.onPlayerRoll');
		expect(result.triggeredStates['core.onPlayerRoll']).toEqual({});
	});

	it('is a no-op when the key already exists', () => {
		const existing = addTriggeredState(base, 'core.onPlayerRoll');
		const again = addTriggeredState(existing, 'core.onPlayerRoll');
		expect(again).toBe(existing);
	});

	it('does not mutate the original config', () => {
		addTriggeredState(base, 'core.onPlayerRoll');
		expect(Object.keys(base.triggeredStates)).toHaveLength(0);
	});
});

// ─── removeTriggeredState ─────────────────────────────────────────────────────

describe('removeTriggeredState', () => {
	it('removes an existing triggered state', () => {
		const cfg = addTriggeredState(makeAnimationConfig(), 'core.onPlayerRoll');
		const result = removeTriggeredState(cfg, 'core.onPlayerRoll');
		expect('core.onPlayerRoll' in result.triggeredStates).toBe(false);
	});

	it('is safe when the key does not exist', () => {
		const cfg = makeAnimationConfig();
		const result = removeTriggeredState(cfg, 'nonexistent');
		expect(Object.keys(result.triggeredStates)).toHaveLength(0);
	});

	it('does not mutate the original config', () => {
		const cfg = addTriggeredState(makeAnimationConfig(), 'core.onPlayerRoll');
		removeTriggeredState(cfg, 'core.onPlayerRoll');
		expect('core.onPlayerRoll' in cfg.triggeredStates).toBe(true);
	});
});

// ─── setReEntryPolicy ─────────────────────────────────────────────────────────

describe('setReEntryPolicy', () => {
	it('updates the re-entry policy', () => {
		const cfg = makeAnimationConfig();
		expect(setReEntryPolicy(cfg, 'ignore').reEntry).toBe('ignore');
	});

	it('does not mutate the original config', () => {
		const cfg = makeAnimationConfig();
		setReEntryPolicy(cfg, 'queue');
		expect(cfg.reEntry).toBe('restart');
	});
});

// ─── setAnimationPhase ────────────────────────────────────────────────────────

describe('setAnimationPhase', () => {
	it('sets the entrance phase', () => {
		const anim = makeKeyframeAnimation();
		const result = setAnimationPhase({}, 'entrance', anim);
		expect(result.entrance).toBe(anim);
	});

	it('clears a phase when passed undefined', () => {
		const state = { entrance: makeKeyframeAnimation() };
		const result = setAnimationPhase(state, 'entrance', undefined);
		expect(result.entrance).toBeUndefined();
	});
});

// ─── customPropertiesOf ───────────────────────────────────────────────────────

describe('customPropertiesOf', () => {
	it('returns keys outside the standard set', () => {
		const frame: AnimKeyframe = { 'offset': 0, 'transform': '', 'opacity': 1, 'filter': '', 'font-size': '12px' };
		expect(customPropertiesOf(frame)).toEqual(['font-size']);
	});

	it('returns an empty array for a standard-only keyframe', () => {
		const frame: AnimKeyframe = { offset: 0, transform: '', opacity: 1, filter: '' };
		expect(customPropertiesOf(frame)).toEqual([]);
	});
});
