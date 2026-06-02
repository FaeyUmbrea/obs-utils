import type { OverlayData, OverlayTrack } from '../../../utils/types.ts';
import { flushSync, mount, tick, unmount } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { describe, expect, it, vi } from 'vitest';
import KeyframeLaneStrips from '../KeyframeLaneStrips.svelte';

// settings.ts calls Hooks.once at module level — mock before the import chain resolves.
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

function makeTrack(lanes: any[] = []): OverlayTrack {
	return {
		id: 'track-1',
		name: 'Idle',
		durationMs: 2000,
		behavior: { type: 'static' },
		lanes,
	};
}

function makeLayer(components: any[] = []): OverlayData {
	return {
		type: 'sl',
		components,
		style: '',
		config: {},
	} as any;
}

function makeComp(id: string) {
	return { id, type: 'pt', data: '', style: '' };
}

function baseProps(overrides: Partial<any> = {}) {
	return {
		layer: makeLayer([makeComp('c1')]),
		track: makeTrack([{ componentId: 'c1', keyframes: [], propertyKeyframes: {} }]),
		selection: null,
		playheadT: 0,
		expandedComponents: new SvelteSet<string>(),
		commit: vi.fn(),
		onSetWorkspaceLasso: vi.fn(),
		...overrides,
	};
}

describe('keyframeLaneStrips.svelte', () => {
	it('renders a .lane-strip.comp-strip per component', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const layer = makeLayer([makeComp('c1'), makeComp('c2')]);
		const track = makeTrack([
			{ componentId: 'c1', keyframes: [], propertyKeyframes: {} },
			{ componentId: 'c2', keyframes: [], propertyKeyframes: {} },
		]);

		const instance = mount(KeyframeLaneStrips, {
			target,
			props: { ...baseProps(), layer, track },
		});

		const strips = target.querySelectorAll('.lane-strip.comp-strip');
		expect(strips).toHaveLength(2);

		unmount(instance);
	});

	it('renders legacy keyframe markers for each lane keyframe', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const track = makeTrack([{
			componentId: 'c1',
			keyframes: [{ t: 0 }, { t: 500 }],
			propertyKeyframes: {},
		}]);

		const instance = mount(KeyframeLaneStrips, {
			target,
			props: { ...baseProps(), track },
		});

		// Each legacy kf gets a kf-marker with kf-legacy class
		const legacyMarkers = target.querySelectorAll('.kf-marker.kf-legacy');
		expect(legacyMarkers).toHaveLength(2);

		unmount(instance);
	});

	it('clicking a legacy marker updates selection bindable', async () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		let selection: any = null;

		const track = makeTrack([{
			componentId: 'c1',
			keyframes: [{ t: 100 }],
			propertyKeyframes: {},
		}]);

		const instance = mount(KeyframeLaneStrips, {
			target,
			props: {
				...baseProps({ track }),
				get selection() { return selection; },
				set selection(v) { selection = v; },
			},
		});

		const marker = target.querySelector('.kf-marker.kf-legacy') as HTMLElement;
		expect(marker).not.toBeNull();
		marker.click();
		await tick();

		expect(selection).not.toBeNull();
		expect(selection?.kind).toBe('legacy-kf');
		expect(selection?.componentId).toBe('c1');

		unmount(instance);
	});

	it('backspace key with a legacy-kf selection deletes keyframe and calls commit', async () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		let selection: any = { kind: 'legacy-kf', componentId: 'c1', index: 0 };
		const commit = vi.fn();

		const lane = { componentId: 'c1', keyframes: [{ t: 0 }], propertyKeyframes: {} };
		const track = makeTrack([lane]);

		const instance = mount(KeyframeLaneStrips, {
			target,
			props: {
				...baseProps({ track, commit }),
				get selection() { return selection; },
				set selection(v) { selection = v; },
			},
		});
		// onMount registers the capture-phase keydown listener; flush the microtask queue first.
		flushSync();

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
		await tick();

		expect(commit).toHaveBeenCalled();
		// lane.keyframes should now be empty
		expect(lane.keyframes).toHaveLength(0);

		unmount(instance);
	});

	it('window mouseup with no drag is a no-op (does not throw)', async () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(KeyframeLaneStrips, {
			target,
			props: baseProps(),
		});

		expect(() => {
			window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
		}).not.toThrow();

		await tick();
		unmount(instance);
	});

	it('prop-strip lane appears when component is expanded', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const expanded = new SvelteSet(['c1']);

		const track = makeTrack([{
			componentId: 'c1',
			keyframes: [],
			propertyKeyframes: { opacity: [{ t: 0, v: 1 }] },
		}]);

		const instance = mount(KeyframeLaneStrips, {
			target,
			props: { ...baseProps({ track }), expandedComponents: expanded },
		});

		// Expanded component should have prop-strip lanes
		const propStrips = target.querySelectorAll('.lane-strip.prop-strip');
		expect(propStrips.length).toBeGreaterThan(0);

		unmount(instance);
	});
});
