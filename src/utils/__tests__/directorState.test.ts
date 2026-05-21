import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSetting = vi.fn();

vi.mock('../settings.ts', () => ({
	OBSAction: {
		SwitchScene: 'obs-utils.applications.obsRemote.switchScene',
		ToggleSource: 'obs-utils.applications.obsRemote.toggleSource',
		EnableSource: 'obs-utils.applications.obsRemote.enableSource',
		DisableSource: 'obs-utils.applications.obsRemote.disableSource',
	},
	getSetting,
	setSetting: vi.fn(),
}));
vi.mock('../canvas.ts', () => ({}));
vi.mock('../obs.ts', () => ({}));
vi.mock('../defaultOverlays.ts', () => ({ getExampleOverlay: vi.fn(() => []) }));

function stubGameCombat(started: boolean) {
	vi.stubGlobal('game', { combat: { started } });
}

async function loadFresh() {
	vi.resetModules();
	return await import('../directorState.ts');
}

// ─── getDirectorState ────────────────────────────────────────────────────────

describe('getDirectorState', () => {
	beforeEach(() => {
		getSetting.mockReset();
		vi.unstubAllGlobals();
	});

	it('returns activeTrackingMode = in-combat slot when combat is started', async () => {
		stubGameCombat(true);
		getSetting.mockImplementation((k: string) => {
			if (k === 'defaultInCombat') return 'trackTurnPlayer';
			if (k === 'defaultOutOfCombat') return 'birdseye';
			if (k === 'obsModeUser') return 'user-id-1';
			return undefined;
		});
		const m = await loadFresh();
		const state = m.getDirectorState();
		expect(state.activeTrackingMode).toBe('trackTurnPlayer');
		expect(state.isInCombat).toBe(true);
	});

	it('returns activeTrackingMode = out-of-combat slot when no combat', async () => {
		stubGameCombat(false);
		getSetting.mockImplementation((k: string) => {
			if (k === 'defaultInCombat') return 'trackTurnPlayer';
			if (k === 'defaultOutOfCombat') return 'birdseye';
			return undefined;
		});
		const m = await loadFresh();
		const state = m.getDirectorState();
		expect(state.activeTrackingMode).toBe('birdseye');
		expect(state.isInCombat).toBe(false);
	});

	it('normalizes obsModeUser "none" to null', async () => {
		stubGameCombat(false);
		getSetting.mockImplementation((k: string) => (k === 'obsModeUser' ? 'none' : ''));
		const m = await loadFresh();
		expect(m.getDirectorState().obsModeUserId).toBeNull();
	});

	it('passes through a real obsModeUser id', async () => {
		stubGameCombat(false);
		getSetting.mockImplementation((k: string) => (k === 'obsModeUser' ? 'user-xyz' : ''));
		const m = await loadFresh();
		expect(m.getDirectorState().obsModeUserId).toBe('user-xyz');
	});
});

// ─── initDirectorStateBridge ─────────────────────────────────────────────────

describe('initDirectorStateBridge', () => {
	beforeEach(() => {
		getSetting.mockReset();
		vi.unstubAllGlobals();
	});

	function setupHookCapture() {
		const handlers: Record<string, ((...args: any[]) => void)[]> = {};
		const callAll = vi.fn();
		const on = vi.fn((hook: string, fn: (...args: any[]) => void) => {
			(handlers[hook] ??= []).push(fn);
			return 1;
		});
		vi.stubGlobal('Hooks', { on, callAll });
		return { handlers, callAll };
	}

	it('emits stateChanged when defaultInCombat updateSetting fires', async () => {
		stubGameCombat(false);
		let inCombat = 'trackAll';
		getSetting.mockImplementation((k: string) => {
			if (k === 'defaultInCombat') return inCombat;
			return '';
		});
		const { handlers, callAll } = setupHookCapture();
		const m = await loadFresh();
		m.initDirectorStateBridge();
		// Change the setting before firing the hook so the diff is detected
		inCombat = 'trackOne';
		handlers.updateSetting[0]({ key: 'obs-utils.defaultInCombat' });
		expect(callAll).toHaveBeenCalledTimes(1);
		const [hookName, next, prev] = callAll.mock.calls[0];
		expect(hookName).toBe('obs-utils.director.stateChanged');
		expect(next.trackingModeInCombat).toBe('trackOne');
		expect(prev.trackingModeInCombat).toBe('trackAll');
	});

	it('does not emit when an unrelated obs-utils setting updates', async () => {
		stubGameCombat(false);
		getSetting.mockReturnValue('');
		const { handlers, callAll } = setupHookCapture();
		const m = await loadFresh();
		m.initDirectorStateBridge();
		handlers.updateSetting[0]({ key: 'obs-utils.streamOverlays' });
		expect(callAll).not.toHaveBeenCalled();
	});

	it('does not emit when a non-obs-utils setting updates', async () => {
		stubGameCombat(false);
		getSetting.mockReturnValue('');
		const { handlers, callAll } = setupHookCapture();
		const m = await loadFresh();
		m.initDirectorStateBridge();
		handlers.updateSetting[0]({ key: 'core.someOtherSetting' });
		expect(callAll).not.toHaveBeenCalled();
	});

	it('emits on combatStart hook', async () => {
		let started = false;
		vi.stubGlobal('game', {
			combat: {
				get started() {
					return started;
				},
			},
		});
		getSetting.mockReturnValue('');
		const { handlers, callAll } = setupHookCapture();
		const m = await loadFresh();
		m.initDirectorStateBridge();
		started = true;
		handlers.combatStart[0]();
		expect(callAll).toHaveBeenCalledTimes(1);
		const [, next] = callAll.mock.calls[0];
		expect(next.isInCombat).toBe(true);
	});

	it('emits on deleteCombat hook', async () => {
		let started = true;
		vi.stubGlobal('game', {
			combat: {
				get started() {
					return started;
				},
			},
		});
		getSetting.mockReturnValue('');
		const { handlers, callAll } = setupHookCapture();
		const m = await loadFresh();
		m.initDirectorStateBridge();
		started = false;
		handlers.deleteCombat[0]();
		expect(callAll).toHaveBeenCalledTimes(1);
		const [, next] = callAll.mock.calls[0];
		expect(next.isInCombat).toBe(false);
	});

	it('does not re-emit when state is unchanged (dedup via diff)', async () => {
		stubGameCombat(false);
		getSetting.mockReturnValue('sameValue');
		const { handlers, callAll } = setupHookCapture();
		const m = await loadFresh();
		m.initDirectorStateBridge();
		// Setting hook fires but the underlying value hasn't moved.
		handlers.updateSetting[0]({ key: 'obs-utils.defaultInCombat' });
		expect(callAll).not.toHaveBeenCalled();
	});
});
