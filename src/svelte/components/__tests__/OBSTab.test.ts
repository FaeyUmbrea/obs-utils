import { mount, tick, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import OBSTab from '../OBSTab.svelte';

// settings.ts calls Hooks.once at module level — mock it before any import chain runs.
vi.mock('../../../utils/settings.ts', () => ({
	OBSAction: {
		SwitchScene: 'obs-utils.applications.obsRemote.switchScene',
		ToggleSource: 'obs-utils.applications.obsRemote.toggleSource',
		EnableSource: 'obs-utils.applications.obsRemote.enableSource',
		DisableSource: 'obs-utils.applications.obsRemote.disableSource',
	},
	settings: { getReadableStore: () => undefined, getStore: () => undefined },
	getSetting: () => undefined,
	setSetting: async () => undefined,
}));

// OBSSetting touches Foundry globals and svelte/transition — stub it out.
vi.mock('../OBSSetting.svelte', () => ({
	default: (opts: any) => {
		const li = document.createElement('li');
		li.className = 'obs-setting-stub';
		// Expose removeFn via a button so tests can trigger removal.
		if (opts?.props?.removeFn) {
			const btn = document.createElement('button');
			btn.className = 'remove-btn';
			btn.addEventListener('click', () => opts.props.removeFn());
			li.appendChild(btn);
		}
		opts?.target?.appendChild(li);
		return {
			destroy() {
				li.remove();
			},
		};
	},
}));

describe('oBSTab.svelte', () => {
	it('mounts with an empty eventArray and renders scroll wrapper', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		let eventArray: any[] = [];
		let handleAdd: (() => void) | undefined;

		const instance = mount(OBSTab, {
			target,
			props: {
				get eventArray() { return eventArray; },
				set eventArray(v) { eventArray = v; },
				useWebSocket: false,
				get handleAdd() { return handleAdd; },
				set handleAdd(v) { handleAdd = v; },
			},
		});

		expect(target.querySelector('.scroll')).not.toBeNull();

		unmount(instance);
	});

	it('handleAdd is bound to a function after mount', async () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		let eventArray: any[] = [];
		let handleAdd: (() => void) | undefined;

		const instance = mount(OBSTab, {
			target,
			props: {
				get eventArray() { return eventArray; },
				set eventArray(v) { eventArray = v; },
				useWebSocket: false,
				get handleAdd() { return handleAdd; },
				set handleAdd(v) { handleAdd = v; },
			},
		});

		await tick();

		expect(typeof handleAdd).toBe('function');

		unmount(instance);
	});

	it('calling handleAdd appends an OBSEvent to eventArray', async () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		let eventArray: any[] = [];
		let handleAdd: (() => void) | undefined;

		const instance = mount(OBSTab, {
			target,
			props: {
				get eventArray() { return eventArray; },
				set eventArray(v) { eventArray = v; },
				useWebSocket: false,
				get handleAdd() { return handleAdd; },
				set handleAdd(v) { handleAdd = v; },
			},
		});

		await tick();

		expect(typeof handleAdd).toBe('function');
		handleAdd!();

		expect(eventArray).toHaveLength(1);
		expect(eventArray[0]).toHaveProperty('targetAction');

		unmount(instance);
	});
});
