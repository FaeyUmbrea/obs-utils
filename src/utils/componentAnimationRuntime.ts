import type { AnimationState, ComponentAnimationConfig, KeyframeAnimation } from './types.ts';
import gsap from './gsap.ts';

// ─── AnimationController ─────────────────────────────────────────────────────

export interface AnimationController {
	play: () => void;
	stop: () => void;
	isPlaying: () => boolean;
	/**
	 * Total run time of the entire entrance+steady+exit lifecycle in ms.
	 * Infinite-loop steady states return `Infinity`.
	 */
	totalMs: () => number;
}

/** Build one GSAP sub-timeline for a single KeyframeAnimation phase. */
function buildPhaseTl(el: HTMLElement, anim: KeyframeAnimation): gsap.core.Timeline {
	const kfs = [...anim.keyframes].sort((a, b) => a.offset - b.offset);
	const totalSec = anim.duration / 1000;
	const ease = anim.ease ?? 'linear';

	const loopVars: gsap.TimelineVars = {};
	if (anim.loop === 'restart' || anim.loop === 'infinite') {
		loopVars.repeat = -1;
	} else if (anim.loop === 'pingpong') {
		loopVars.repeat = -1;
		loopVars.yoyo = true;
	}

	const tl = gsap.timeline({ ...loopVars, paused: true });

	let prevOffset = 0;
	for (const kf of kfs) {
		const { offset, ...cssPairs } = kf;
		const segDur = (offset - prevOffset) * totalSec;
		if (segDur <= 0) {
			tl.set(el, cssPairs);
		} else {
			tl.to(el, { ...cssPairs, duration: segDur, ease });
		}
		prevOffset = offset;
	}

	return tl;
}

/**
 * Build a GSAP Timeline that plays an `AnimationState`'s entrance → steady → exit
 * lifecycle on the given DOM element.
 */
export function buildAnimationController(el: HTMLElement, state: AnimationState): AnimationController {
	const masterTl = gsap.timeline({ paused: true });

	const hasEntrance = !!(state.entrance && state.entrance.keyframes.length > 0);
	const hasSteady = !!(state.steady && state.steady.keyframes.length > 0);
	const hasExit = !!(state.exit && state.exit.keyframes.length > 0);

	if (hasEntrance) masterTl.add(buildPhaseTl(el, state.entrance!));
	if (hasSteady) masterTl.add(buildPhaseTl(el, state.steady!));
	if (hasExit) masterTl.add(buildPhaseTl(el, state.exit!));

	const steadyIsInfinite = hasSteady
		&& (state.steady!.loop === 'restart' || state.steady!.loop === 'pingpong' || state.steady!.loop === 'infinite');

	return {
		play: () => { masterTl.play(); },
		stop: () => { masterTl.kill(); },
		isPlaying: () => masterTl.isActive(),
		totalMs: () => {
			if (steadyIsInfinite) return Infinity;
			return masterTl.duration() * 1000;
		},
	};
}

// ─── StateMachineController ──────────────────────────────────────────────────

export interface StateMachineController {
	/** Apply a trigger event. Returns true if a transition was started. */
	fireTrigger: (eventKey: string) => boolean;
	/** Force return to defaultState. */
	returnToDefault: () => void;
	/** Dispose. Idempotent. */
	dispose: () => void;
}

interface MachineState {
	key: string | null; // null = defaultState
	ctrl: AnimationController | null;
	queuedKey: string | null;
	queueCheck: ReturnType<typeof setInterval> | null;
}

function stopQueueCheck(ms: MachineState) {
	if (ms.queueCheck !== null) {
		clearInterval(ms.queueCheck);
		ms.queueCheck = null;
		ms.queuedKey = null;
	}
}

function killCtrl(ms: MachineState) {
	if (ms.ctrl !== null) {
		ms.ctrl.stop();
		ms.ctrl = null;
	}
}

function enterState(
	el: HTMLElement,
	config: ComponentAnimationConfig,
	ms: MachineState,
	key: string | null,
	state: AnimationState,
) {
	ms.key = key;
	const ctrl = buildAnimationController(el, state);
	ms.ctrl = ctrl;
	ctrl.play();
}

/**
 * Run the exit phase of the current state then call `onDone`.
 * If there is no exit phase, calls `onDone` synchronously.
 */
function playExitThenCall(
	el: HTMLElement,
	config: ComponentAnimationConfig,
	ms: MachineState,
	onDone: () => void,
) {
	killCtrl(ms);

	const prevStateKey = ms.key;
	if (prevStateKey !== null) {
		const prevState = config.triggeredStates[prevStateKey] ?? config.defaultState;
		if (prevState.exit && prevState.exit.keyframes.length > 0) {
			const exitCtrl = buildAnimationController(el, { exit: prevState.exit });
			ms.ctrl = exitCtrl;
			exitCtrl.play();
			const exitMs = exitCtrl.totalMs();
			setTimeout(() => {
				// Only advance if nothing else has taken over the controller slot.
				if (ms.ctrl === exitCtrl) onDone();
			}, exitMs === Infinity ? 0 : exitMs);
			return;
		}
	}

	onDone();
}

/**
 * High-level coordinator for a single component's animation across state changes.
 */
export function createComponentStateMachine(
	el: HTMLElement,
	config: ComponentAnimationConfig,
): StateMachineController {
	const ms: MachineState = { key: null, ctrl: null, queuedKey: null, queueCheck: null };

	// Boot into the default state immediately.
	enterState(el, config, ms, null, config.defaultState);

	return {
		fireTrigger: (eventKey: string): boolean => {
			const nextState = config.triggeredStates[eventKey];
			if (!nextState) return false;

			// Transitioning from defaultState always proceeds.
			if (ms.key === null) {
				stopQueueCheck(ms);
				playExitThenCall(el, config, ms, () => {
					enterState(el, config, ms, eventKey, nextState);
				});
				return true;
			}

			// Non-default state active — consult reEntry policy.
			const policy = config.reEntry;

			if (policy === 'ignore') return false;

			if (policy === 'queue') {
				ms.queuedKey = eventKey;
				if (ms.queueCheck === null) {
					ms.queueCheck = setInterval(() => {
						if (!ms.ctrl?.isPlaying()) {
							const queued = ms.queuedKey;
							stopQueueCheck(ms);
							if (queued !== null) {
								playExitThenCall(el, config, ms, () => {
									const qs = config.triggeredStates[queued];
									if (qs) enterState(el, config, ms, queued, qs);
								});
							}
						}
					}, 50);
				}
				return true;
			}

			if (policy === 'replace') {
				stopQueueCheck(ms);
				killCtrl(ms);
				// Snap directly to the new state's steady, skipping entrance/exit.
				enterState(el, config, ms, eventKey, { steady: nextState.steady });
				return true;
			}

			if (policy === 'extend' && ms.key === eventKey) {
				// Same state: restart entrance+steady to extend the run time.
				stopQueueCheck(ms);
				killCtrl(ms);
				enterState(el, config, ms, eventKey, { entrance: nextState.entrance, steady: nextState.steady });
				return true;
			}

			// 'restart' (default) or 'extend' with a different state.
			stopQueueCheck(ms);
			if (ms.key === eventKey) {
				// Same state restart: kill and re-run from entrance.
				killCtrl(ms);
				enterState(el, config, ms, eventKey, nextState);
			} else {
				// Different state: exit current, then run next entrance → steady.
				playExitThenCall(el, config, ms, () => {
					enterState(el, config, ms, eventKey, nextState);
				});
			}
			return true;
		},

		returnToDefault: () => {
			stopQueueCheck(ms);
			playExitThenCall(el, config, ms, () => {
				enterState(el, config, ms, null, config.defaultState);
			});
		},

		dispose: () => {
			stopQueueCheck(ms);
			killCtrl(ms);
		},
	};
}
