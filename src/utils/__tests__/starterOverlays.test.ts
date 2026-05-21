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
vi.mock('../canvas.ts', () => ({}));
vi.mock('../obs.ts', () => ({}));

// Late import — must come after mocks and after we reset module state per test.
async function loadFresh() {
	vi.resetModules();
	return await import('../defaultOverlays.ts');
}

describe('starter overlay registry', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('default starter is a single example overlay when nothing registered', async () => {
		const m = await loadFresh();
		const starter = m.readStarterOverlays();
		expect(starter).toHaveLength(1);
		expect(starter[0].type).toBe('wysiwyg');
	});

	it('registerStarter replaces the default with the registered set', async () => {
		const m = await loadFresh();
		const custom = [{ type: 'wysiwyg', name: 'A', components: [], style: '', config: {} }] as any;
		m.registerStarter(custom);
		const out = m.readStarterOverlays();
		expect(out).toBe(custom);
	});

	it('last writer wins across multiple registerStarter calls', async () => {
		const m = await loadFresh();
		const first = [{ type: 'wysiwyg', name: 'first', components: [], style: '', config: {} }] as any;
		const second = [
			{ type: 'wysiwyg', name: 'second-a', components: [], style: '', config: {} },
			{ type: 'wysiwyg', name: 'second-b', components: [], style: '', config: {} },
		] as any;
		m.registerStarter(first);
		m.registerStarter(second);
		expect(m.readStarterOverlays()).toBe(second);
		expect(m.readStarterOverlays()).toHaveLength(2);
	});

	it('registerStarter([]) returns the empty set, NOT the default fallback', async () => {
		// Intentional semantics: a system module can ship "no starter" if it wants.
		const m = await loadFresh();
		m.registerStarter([]);
		expect(m.readStarterOverlays()).toEqual([]);
	});

	it('readStarterOverlays returns the default even after import without registering', async () => {
		// Fresh module load → no registered starter → fallback to example overlay
		const m = await loadFresh();
		const out = m.readStarterOverlays();
		expect(out.length).toBe(1);
		expect(out[0].components.length).toBeGreaterThan(0);
	});
});
