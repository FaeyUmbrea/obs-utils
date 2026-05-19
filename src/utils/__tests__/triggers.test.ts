import type { OverlayTriggerRegistration } from '../api.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObsUtilsApi } from '../api.ts';
import { getByTriggerOrDataPath } from '../helpers.ts';

// Stub modules that call Foundry globals at evaluation time.
// vi.mock calls are hoisted by Vitest before module resolution regardless of placement.
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
vi.mock('../canvas.ts', () => ({}));
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

// ─── getByTriggerOrDataPath ────────────────────────────────────────────────

describe('getByTriggerOrDataPath', () => {
	it('resolves trigger.actor.name against the payload', () => {
		const payload = { actor: { name: 'Gandalf' } };
		expect(getByTriggerOrDataPath(null, payload, 'trigger.actor.name')).toBe('Gandalf');
	});

	it('resolves a non-trigger path against the actor', () => {
		const actor = { system: { attributes: { hp: { value: 42 } } } };
		expect(getByTriggerOrDataPath(actor, undefined, 'system.attributes.hp.value')).toBe(42);
	});

	it('returns \'\' when path starts with trigger. and payload is undefined', () => {
		expect(getByTriggerOrDataPath(null, undefined, 'trigger.foo')).toBe('');
	});

	it('handles deep payload paths like trigger.roll.total', () => {
		const payload = { roll: { total: 18 } };
		expect(getByTriggerOrDataPath(null, payload, 'trigger.roll.total')).toBe(18);
	});
});

// ─── ObsUtilsApi overlay trigger registry ─────────────────────────────────

describe('obsUtilsApi overlay triggers', () => {
	let api: ObsUtilsApi;

	beforeEach(() => {
		api = new ObsUtilsApi();
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
