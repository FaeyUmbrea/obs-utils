import type { ObsUtilsApi, OverlayTriggerRegistration } from '../api.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../settings.ts', () => ({
	OBSAction: {
		SwitchScene: 'obs-utils.applications.obsRemote.switchScene',
		ToggleSource: 'obs-utils.applications.obsRemote.toggleSource',
		EnableSource: 'obs-utils.applications.obsRemote.enableSource',
		DisableSource: 'obs-utils.applications.obsRemote.disableSource',
	},
	getSetting: vi.fn(),
	setSetting: vi.fn(),
}));
vi.mock('../canvas.ts', () => ({
	clampAndApplyExternal: vi.fn(),
	getCurrentUser: vi.fn(),
	getLocalViewport: vi.fn(),
	VIEWPORT_DATA: {},
	viewportChanged: vi.fn(),
}));
vi.mock('../cameraSequencePlayer.ts', () => ({ playSequence: vi.fn() }));
vi.mock('../obs.ts', () => ({}));
vi.mock('../defaultOverlays.ts', () => ({ getExampleOverlay: vi.fn(() => []) }));
vi.mock('../svelte/components/editors/FallbackEditor.svelte', () => ({ default: {} }));
vi.mock('../svelte/components/editors/WYSIWYGOverlayEditor.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/overlaycomponents/ActorValComponent.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/overlaycomponents/AVBoolIconComponent.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/overlaycomponents/AVBoolImageComponent.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/overlaycomponents/AVImageDisplayComponent.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/overlaycomponents/AVMultiIconComponent.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/overlaycomponents/AVMultiImageComponent.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/overlaycomponents/FAIconComponent.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/overlaycomponents/ProgressBarComponent.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/SingleLineOverlay.svelte', () => ({ default: {} }));
vi.mock('../svelte/streamoverlays/WYSIWYGOverlay.svelte', () => ({ default: {} }));

function stubGlobals() {
	vi.stubGlobal('Hooks', { on: vi.fn(), once: vi.fn(), off: vi.fn(), callAll: vi.fn() });
	vi.stubGlobal('game', {
		user: { isGM: true },
		modules: { get: vi.fn() },
		socket: { on: vi.fn(), emit: vi.fn() },
	});
	vi.stubGlobal('foundry', {
		utils: {
			randomID: vi.fn(() => 'id'),
			mergeObject: (target: any, source: any) => ({ ...target, ...source }),
		},
	});
}

async function loadModules() {
	vi.resetModules();
	stubGlobals();
	const api = await import('../api.ts');
	const helpers = await import('../helpers.ts');
	return { api, helpers };
}

describe('getByTriggerOrDataPath', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('resolves trigger.actor.name against the payload', async () => {
		const { helpers } = await loadModules();
		const payload = { actor: { name: 'Gandalf' } };
		expect(helpers.getByTriggerOrDataPath(null, payload, 'trigger.actor.name')).toBe('Gandalf');
	});

	it('resolves a non-trigger path against the actor', async () => {
		const { helpers } = await loadModules();
		const actor = { system: { attributes: { hp: { value: 42 } } } };
		expect(helpers.getByTriggerOrDataPath(actor, undefined, 'system.attributes.hp.value')).toBe(42);
	});

	it('returns \'\' when path starts with trigger. and payload is undefined', async () => {
		const { helpers } = await loadModules();
		expect(helpers.getByTriggerOrDataPath(null, undefined, 'trigger.foo')).toBe('');
	});

	it('handles deep payload paths like trigger.roll.total', async () => {
		const { helpers } = await loadModules();
		const payload = { roll: { total: 18 } };
		expect(helpers.getByTriggerOrDataPath(null, payload, 'trigger.roll.total')).toBe(18);
	});
});

describe('obsUtilsApi overlay triggers', () => {
	let api: ObsUtilsApi;
	let mod: typeof import('../api.ts');

	beforeEach(async () => {
		vi.unstubAllGlobals();
		const loaded = await loadModules();
		mod = loaded.api;
		api = new mod.ObsUtilsApi();
	});

	it('registerOverlayTrigger + overlayTriggers.get round-trips', () => {
		const reg: OverlayTriggerRegistration = {
			key: 'test.myTrigger',
			name: 'My Trigger',
			icon: 'fas fa-fire',
		};
		api.registerOverlayTrigger(reg);
		expect(api.overlayTriggers.get('test.myTrigger')).toBe(reg);
	});

	it('fireOverlayTrigger calls Hooks.callAll with the right args', () => {
		const callAll = vi.fn();
		(globalThis as any).Hooks = { callAll };

		const payload = { foo: 'bar' };
		api.fireOverlayTrigger('core.onPlayerRoll', payload);

		expect(callAll).toHaveBeenCalledWith('obs-utils.overlayTrigger', 'core.onPlayerRoll', payload);
	});
});
