import { flushSync, mount, unmount } from 'svelte';
import { readable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

const { activateMock, deactivateMock } = vi.hoisted(() => ({
	activateMock: vi.fn(),
	deactivateMock: vi.fn(),
}));

vi.mock('../../utils/cssInjection.ts', () => ({
	activateCSSInjection: activateMock,
	deactivateCSSInjection: deactivateMock,
}));

vi.mock('../../utils/helpers', () => ({
	getApi: () => ({
		singleInstanceOverlays: new Set(),
		singleInstanceOverlaysSvelte5: new Set(),
	}),
}));

vi.mock('../../utils/settings.ts', () => ({
	OBSAction: {
		SwitchScene: 'obs-utils.applications.obsRemote.switchScene',
		ToggleSource: 'obs-utils.applications.obsRemote.toggleSource',
		EnableSource: 'obs-utils.applications.obsRemote.enableSource',
		DisableSource: 'obs-utils.applications.obsRemote.disableSource',
	},
	settings: {
		getReadableStore: (key: string) => readable(key === 'streamOverlays' ? [] : []),
	},
}));

vi.mock('../streamoverlays/OverlayHost.svelte', () => ({
	default: (opts: any) => {
		const div = document.createElement('div');
		div.className = 'overlay-host-stub';
		opts?.target?.appendChild(div);
		return { destroy() { div.remove(); } };
	},
}));

vi.mock('../utilities/ExternalComponent.svelte', () => ({
	default: (opts: any) => {
		const div = document.createElement('div');
		div.className = 'external-stub';
		opts?.target?.appendChild(div);
		return { destroy() { div.remove(); } };
	},
}));

vi.mock('../utilities/LegacyExternalComponent.svelte', () => ({
	default: (opts: any) => {
		const div = document.createElement('div');
		div.className = 'legacy-stub';
		opts?.target?.appendChild(div);
		return { destroy() { div.remove(); } };
	},
}));

// Import after mocks are declared so the mocked modules are in place.
const { default: OverlayRenderer } = await import('../OverlayRenderer.svelte');

describe('overlayRenderer.svelte', () => {
	it('mounts and renders the overlay-renderer wrapper', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(OverlayRenderer, { target });

		expect(target.querySelector('.overlay-renderer')).not.toBeNull();

		unmount(instance);
	});

	it('calls activateCSSInjection on mount', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		activateMock.mockClear();

		const instance = mount(OverlayRenderer, { target });
		// Svelte 5 onMount runs in a microtask; flushSync forces it to run now.
		flushSync();

		expect(activateMock).toHaveBeenCalledTimes(1);

		unmount(instance);
	});

	it('calls deactivateCSSInjection on unmount', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		deactivateMock.mockClear();

		const instance = mount(OverlayRenderer, { target });
		// Svelte 5 onMount/onDestroy run in microtasks; flushSync drains them.
		flushSync();
		unmount(instance);

		expect(deactivateMock).toHaveBeenCalledTimes(1);
	});
});
