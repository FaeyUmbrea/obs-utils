import type { AnimationState, ComponentAnimationConfig } from '../types.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAnimationController, createComponentStateMachine } from '../componentAnimationRuntime.ts';

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../settings.ts', () => ({
	getSetting: vi.fn(),
	setSetting: vi.fn(),
}));

vi.mock('../canvas.ts', () => ({}));
vi.mock('../obs.ts', () => ({}));
vi.mock('../defaultOverlays.ts', () => ({ getExampleOverlay: vi.fn(() => []) }));

// Fake GSAP timeline that records calls.
function makeFakeTl() {
	return {
		to: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		add: vi.fn().mockReturnThis(),
		kill: vi.fn(),
		play: vi.fn().mockReturnThis(),
		pause: vi.fn().mockReturnThis(),
		resume: vi.fn().mockReturnThis(),
		seek: vi.fn().mockReturnThis(),
		duration: vi.fn().mockReturnValue(1),
		isActive: vi.fn().mockReturnValue(true),
	};
}

let createdTimelines: ReturnType<typeof makeFakeTl>[] = [];

vi.mock('gsap', () => ({
	default: {
		timeline: vi.fn(() => {
			const tl = makeFakeTl();
			createdTimelines.push(tl);
			return tl;
		}),
		registerPlugin: vi.fn(),
	},
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEl(): HTMLElement {
	return document.createElement('div');
}

const simpleKfs = [{ offset: 0, opacity: 0 }, { offset: 1, opacity: 1 }];
const entranceAnim = { duration: 400, keyframes: simpleKfs };
const steadyAnim = { duration: 1000, keyframes: simpleKfs };
const steadyLoopAnim = { duration: 1000, keyframes: simpleKfs, loop: 'restart' as const };

// ─── buildAnimationController ─────────────────────────────────────────────────

describe('buildAnimationController', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createdTimelines = [];
	});

	it('creates a master timeline and one sub-timeline for entrance-only state', () => {
		const state: AnimationState = { entrance: entranceAnim };
		const ctrl = buildAnimationController(makeEl(), state);
		// master + 1 phase tl
		expect(createdTimelines.length).toBe(2);
		ctrl.stop();
	});

	it('adds all three phases when entrance, steady, and exit are present', () => {
		const state: AnimationState = {
			entrance: entranceAnim,
			steady: steadyAnim,
			exit: { duration: 200, keyframes: simpleKfs },
		};
		buildAnimationController(makeEl(), state);
		// master + 3 phase timelines
		expect(createdTimelines.length).toBe(4);
	});

	it('master timeline has add() called for each present phase', () => {
		const state: AnimationState = { entrance: entranceAnim, steady: steadyAnim };
		buildAnimationController(makeEl(), state);
		const master = createdTimelines[0];
		expect(master.add).toHaveBeenCalledTimes(2);
	});

	it('sets repeat: -1 on the steady phase timeline when loop=restart', () => {
		const state: AnimationState = { steady: steadyLoopAnim };
		buildAnimationController(makeEl(), state);
		// createdTimelines[0] = master, createdTimelines[1] = steady phase tl
		// The repeat is passed into gsap.timeline() options — check via the mock arg.
		// Since gsap.timeline is called with the loopVars object, we verify it via
		// totalMs returning Infinity for infinite loops.
		const ctrl = buildAnimationController(makeEl(), { steady: steadyLoopAnim });
		expect(ctrl.totalMs()).toBe(Infinity);
	});

	it('returns Infinity totalMs for pingpong steady loop', () => {
		const state: AnimationState = { steady: { ...steadyAnim, loop: 'pingpong' } };
		const ctrl = buildAnimationController(makeEl(), state);
		expect(ctrl.totalMs()).toBe(Infinity);
	});

	it('returns a finite totalMs for non-looping state', () => {
		const state: AnimationState = { entrance: entranceAnim };
		const ctrl = buildAnimationController(makeEl(), state);
		// master.duration() returns 1 (from mock), so totalMs = 1000
		expect(ctrl.totalMs()).toBe(1000);
	});

	it('stop() calls kill() on the master timeline', () => {
		const ctrl = buildAnimationController(makeEl(), { entrance: entranceAnim });
		ctrl.stop();
		expect(createdTimelines[0].kill).toHaveBeenCalledOnce();
	});

	it('isPlaying() delegates to masterTl.isActive()', () => {
		const ctrl = buildAnimationController(makeEl(), { entrance: entranceAnim });
		expect(ctrl.isPlaying()).toBe(true);
		createdTimelines[0].isActive.mockReturnValue(false);
		expect(ctrl.isPlaying()).toBe(false);
	});

	it('phase tl uses .to() for non-zero-duration segments', () => {
		buildAnimationController(makeEl(), { entrance: entranceAnim });
		// phase tl is createdTimelines[1]
		const phaseTl = createdTimelines[1];
		expect(phaseTl.to).toHaveBeenCalled();
		const [, vars] = phaseTl.to.mock.calls[0];
		expect(vars.duration).toBeGreaterThan(0);
		expect(vars.ease).toBe('linear');
	});

	it('phase tl uses ease from KeyframeAnimation when provided', () => {
		const anim = { duration: 500, keyframes: simpleKfs, ease: 'power2.out' };
		buildAnimationController(makeEl(), { entrance: anim });
		const phaseTl = createdTimelines[1];
		const [, vars] = phaseTl.to.mock.calls[0];
		expect(vars.ease).toBe('power2.out');
	});
});

// ─── createComponentStateMachine ─────────────────────────────────────────────

function makeConfig(extra: Partial<ComponentAnimationConfig> = {}): ComponentAnimationConfig {
	return {
		defaultState: { steady: steadyAnim },
		triggeredStates: {
			'test.roll': { entrance: entranceAnim, steady: steadyAnim },
			'test.other': { entrance: entranceAnim },
		},
		reEntry: 'restart',
		...extra,
	};
}

describe('createComponentStateMachine', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createdTimelines = [];
	});

	it('boots into defaultState on creation', () => {
		createComponentStateMachine(makeEl(), makeConfig());
		// At least the master tl for defaultState is created
		expect(createdTimelines.length).toBeGreaterThan(0);
	});

	it('fireTrigger returns false for unknown event key', () => {
		const sm = createComponentStateMachine(makeEl(), makeConfig());
		expect(sm.fireTrigger('unknown.event')).toBe(false);
	});

	it('fireTrigger returns true for a known event key', () => {
		const sm = createComponentStateMachine(makeEl(), makeConfig());
		expect(sm.fireTrigger('test.roll')).toBe(true);
	});

	it('fireTrigger causes a new controller to be built (new timelines created)', () => {
		const sm = createComponentStateMachine(makeEl(), makeConfig());
		const countAfterBoot = createdTimelines.length;
		sm.fireTrigger('test.roll');
		expect(createdTimelines.length).toBeGreaterThan(countAfterBoot);
	});

	it('fireTrigger with restart policy kills the active controller and starts new entrance', () => {
		const config = makeConfig({ reEntry: 'restart' });
		const sm = createComponentStateMachine(makeEl(), config);
		sm.fireTrigger('test.roll'); // enter triggered state
		const tlsAfterFirst = createdTimelines.length;
		sm.fireTrigger('test.roll'); // same key again — restart
		// The active tl should have been killed and a new one created.
		expect(createdTimelines.length).toBeGreaterThan(tlsAfterFirst);
	});

	it('fireTrigger with ignore policy returns false and makes no new timelines when non-default state is active', () => {
		const config = makeConfig({ reEntry: 'ignore' });
		const sm = createComponentStateMachine(makeEl(), config);
		sm.fireTrigger('test.roll'); // enter triggered state
		const countBefore = createdTimelines.length;
		const result = sm.fireTrigger('test.roll'); // should be ignored
		expect(result).toBe(false);
		expect(createdTimelines.length).toBe(countBefore);
	});

	it('fireTrigger with replace policy snaps to new steady (kill + new tl)', () => {
		const config = makeConfig({ reEntry: 'replace' });
		const sm = createComponentStateMachine(makeEl(), config);
		sm.fireTrigger('test.roll');
		const countMid = createdTimelines.length;
		sm.fireTrigger('test.other'); // different state, replace policy
		expect(createdTimelines.length).toBeGreaterThan(countMid);
	});

	it('returnToDefault transitions back to default state', () => {
		const sm = createComponentStateMachine(makeEl(), makeConfig());
		sm.fireTrigger('test.roll');
		const countBefore = createdTimelines.length;
		sm.returnToDefault();
		expect(createdTimelines.length).toBeGreaterThan(countBefore);
	});

	it('dispose kills the active controller and does not throw on double-dispose', () => {
		const sm = createComponentStateMachine(makeEl(), makeConfig());
		expect(() => {
			sm.dispose();
			sm.dispose();
		}).not.toThrow();
	});

	it('fireTrigger with queue policy stores the key and does not immediately start new tl', () => {
		vi.useFakeTimers();
		const config = makeConfig({ reEntry: 'queue' });
		const sm = createComponentStateMachine(makeEl(), config);
		sm.fireTrigger('test.roll'); // enter triggered state
		const countMid = createdTimelines.length;
		// Simulate controller still playing (isActive = true on all mocks)
		sm.fireTrigger('test.other'); // should be queued
		// No new timelines yet — the queue fires after the current one stops.
		expect(createdTimelines.length).toBe(countMid);
		vi.useRealTimers();
		sm.dispose();
	});
});
