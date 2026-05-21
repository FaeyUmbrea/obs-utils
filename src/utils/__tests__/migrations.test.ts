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

	it('v3 world with a roll overlay → converts to wysiwyg+trigger and bumps to v4', async () => {
		const store = makeFoundryWorld({
			settingsVersion: 3,
			streamOverlays: [
				{
					id: 'old-roll',
					type: 'roll',
					name: 'Old Roll',
					enabled: true,
					components: [],
					style: '',
					config: { rollStay: 4000, preRollStay: 0, postRollStay: 0 },
				},
			],
		});

		const m = await loadSettings();
		m.runMigrations();
		// Drain microtasks (migration uses .then() for fire-and-forget writes)
		await Promise.resolve();
		await Promise.resolve();

		const overlays = store.streamOverlays;
		expect(overlays).toHaveLength(1);
		expect(overlays[0].type).toBe('wysiwyg');
		expect(overlays[0].trigger?.eventKey).toBe('core.onPlayerRoll');
		expect(store.settingsVersion).toBe(4);
	});

	it('v3 world with no roll overlay → settingsVersion bumps to 4, overlays untouched', async () => {
		const store = makeFoundryWorld({
			settingsVersion: 3,
			streamOverlays: [
				{ id: 'a', type: 'wysiwyg', name: 'A', components: [], style: '', config: {} },
			],
		});

		const m = await loadSettings();
		m.runMigrations();
		await Promise.resolve();
		await Promise.resolve();

		expect(store.streamOverlays).toHaveLength(1);
		expect(store.streamOverlays[0].type).toBe('wysiwyg');
		expect(store.streamOverlays[0].id).toBe('a');
		expect(store.settingsVersion).toBe(4);
	});

	it('v4 world → runMigrations is a no-op (no settings writes)', async () => {
		const store = makeFoundryWorld({
			settingsVersion: 4,
			streamOverlays: [
				{ id: 'roll-shaped', type: 'roll', name: 'X', components: [], style: '', config: {} },
			],
		});
		// We expect no writes — capture the set spy to count calls.
		const setSpy = vi.spyOn(game.settings, 'set');

		const m = await loadSettings();
		m.runMigrations();
		await Promise.resolve();

		expect(setSpy).not.toHaveBeenCalled();
		// And the stale 'roll' overlay is left as-is because we never ran the migration.
		expect(store.streamOverlays[0].type).toBe('roll');
		expect(store.settingsVersion).toBe(4);
	});

	it('fresh world (no settingsVersion = undefined → treated as 0) → seeds example overlay + bumps to v4', async () => {
		const store = makeFoundryWorld({
			settingsVersion: undefined,
			streamOverlays: [],
			obsRemote: { customEvents: {} },
		});

		const m = await loadSettings();
		m.runMigrations();
		await Promise.resolve();
		await Promise.resolve();

		// v3 seeds the example overlay into empty streamOverlays.
		expect(store.streamOverlays.length).toBeGreaterThan(0);
		expect(store.settingsVersion).toBe(4);
	});
});
