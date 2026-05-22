import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../canvas.ts', () => ({
	scaleToFit: vi.fn(),
	tokenMoved: vi.fn(),
	viewportChanged: vi.fn(),
}));
vi.mock('../obs.ts', () => ({}));
vi.mock('../helpers.ts', () => ({ getGM: vi.fn(() => ({ id: 'gm', active: true })), isOBS: vi.fn(() => false) }));
vi.mock('../defaultOverlays.ts', () => ({
	getExampleOverlay: vi.fn(() => ({ id: 'example', type: 'wysiwyg', components: [], style: '', config: { w: 1920, h: 1080 } })),
	makeRollOverlayFromLegacyConfig: vi.fn((config: any) => ({
		id: undefined,
		type: 'wysiwyg',
		name: 'Roll Overlay',
		components: [],
		style: '',
		config: { w: 250, h: 250 },
		tileBy: 'players',
		_sourceConfig: config,
	})),
}));

interface Store { [k: string]: any }

function makeFoundryWorld(initialSettings: Store) {
	const store: Store = { ...initialSettings };
	vi.stubGlobal('game', {
		user: { isGM: true },
		settings: {
			get: (_mod: string, key: string) => store[key],
			set: async (_mod: string, key: string, value: any) => { store[key] = value; },
		},
	});
	vi.stubGlobal('Hooks', { on: vi.fn(), once: vi.fn(), callAll: vi.fn(), off: vi.fn() });
	vi.stubGlobal('foundry', {
		utils: {
			randomID: vi.fn(() => `id-${Math.random().toString(36).slice(2, 8)}`),
			mergeObject: (target: any, source: any) => ({ ...target, ...source }),
		},
	});
	// Silence the migration console.warn calls so test output stays clean.
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	return store;
}

async function loadSettings() {
	vi.resetModules();
	return await import('../settings.ts');
}

describe('runMigrations orchestration', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('v4 world with no roll overlay → settingsVersion stays at 4, overlays untouched', async () => {
		const store = makeFoundryWorld({
			settingsVersion: 4,
			streamOverlays: [
				{ id: 'a', type: 'wysiwyg', name: 'A', components: [], style: '', config: {} },
			],
		});

		const m = await loadSettings();
		await m.runMigrations();

		expect(store.streamOverlays).toHaveLength(1);
		expect(store.streamOverlays[0].type).toBe('wysiwyg');
		expect(store.streamOverlays[0].id).toBe('a');
		expect(store.settingsVersion).toBe(4);
	});

	it('v4 world → runMigrations is a no-op (no settings writes, no dynamic import)', async () => {
		const store = makeFoundryWorld({
			settingsVersion: 4,
			streamOverlays: [
				{ id: 'x', type: 'wysiwyg', name: 'X', components: [], style: '', config: {} },
			],
		});
		const setSpy = vi.spyOn(game.settings, 'set');

		const m = await loadSettings();
		await m.runMigrations();

		expect(setSpy).not.toHaveBeenCalled();
		expect(store.streamOverlays[0].type).toBe('wysiwyg');
		expect(store.settingsVersion).toBe(4);
	});

	it('fresh world (no settingsVersion = undefined → treated as 0) → seeds example overlay + bumps to v4', async () => {
		const store = makeFoundryWorld({
			settingsVersion: undefined,
			streamOverlays: [],
			obsRemote: { customEvents: {} },
		});

		const m = await loadSettings();
		await m.runMigrations();

		expect(store.streamOverlays.length).toBeGreaterThan(0);
		expect(store.settingsVersion).toBe(4);
	});

	it('v3 world with a 5.0 `type: \'roll\'` overlay → converts in-place to a canvas layer', async () => {
		const legacyConfig = {
			preRollEnabled: true,
			postRollEnabled: false,
			rollFadeIn: 250,
			rollStay: 4000,
			rollFadeOut: 250,
			rollBackground: 'modules/example/bg.png',
			preRollImage: 'modules/example/pre.png',
		};
		const store = makeFoundryWorld({
			settingsVersion: 3,
			streamOverlays: [
				{ id: 'before', type: 'wysiwyg', name: 'Before', components: [], style: '', config: {} },
				{ id: 'roll-1', type: 'roll', name: 'Old Roll', components: [], style: '', config: legacyConfig },
				{ id: 'after', type: 'wysiwyg', name: 'After', components: [], style: '', config: {} },
			],
		});

		const m = await loadSettings();
		await m.runMigrations();

		expect(store.streamOverlays).toHaveLength(3);
		expect(store.streamOverlays[0].id).toBe('before');
		expect(store.streamOverlays[2].id).toBe('after');
		// Converted in-place: same id, new type+shape, original config passed to the factory.
		expect(store.streamOverlays[1].id).toBe('roll-1');
		expect(store.streamOverlays[1].type).toBe('wysiwyg');
		expect(store.streamOverlays[1]._sourceConfig).toEqual(legacyConfig);
		expect(store.settingsVersion).toBe(4);
	});

	it('v3 world with no `roll` entries → no conversion writes happen', async () => {
		const store = makeFoundryWorld({
			settingsVersion: 3,
			streamOverlays: [
				{ id: 'a', type: 'wysiwyg', name: 'A', components: [], style: '', config: {} },
				{ id: 'b', type: 'sl', name: 'B', components: [], style: '', config: {} },
			],
			obsRemote: { customEvents: { 'core.onLoad': [{ conditions: {}, actions: [] }] } },
		});

		const m = await loadSettings();
		await m.runMigrations();

		expect(store.streamOverlays.map((o: any) => o.type)).toEqual(['wysiwyg', 'sl']);
		expect(store.streamOverlays.some((o: any) => o.type === 'roll')).toBe(false);
		expect(store.settingsVersion).toBe(4);
	});
});
