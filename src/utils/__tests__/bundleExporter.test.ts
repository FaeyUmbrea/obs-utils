import type { ImageSlotHandlers } from '../api.ts';
import type { OverlayData } from '../types.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBundle } from '../bundleExporter.ts';
import { getApi } from '../helpers.ts';

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
vi.mock('../helpers.ts', () => ({ getApi: vi.fn() }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOverlayType(slots: Record<string, ImageSlotHandlers>) {
	return { overlayComponentImageSlots: new Map(Object.entries(slots)) };
}

function makeApi(types: Record<string, ReturnType<typeof makeOverlayType>>) {
	return { overlayTypes: new Map(Object.entries(types)) };
}

function overlay(type: string, components: { type: string; data: string }[]): OverlayData {
	return {
		id: 'ov1',
		type,
		components: components.map((c, i) => ({ ...c, style: '', id: `c${i}` })),
		style: '',
		config: {},
	} as unknown as OverlayData;
}

const FAKE_PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes
const FAKE_PNG_DATA_URL = `data:image/png;base64,${btoa(String.fromCharCode(...FAKE_PNG_BYTES))}`;

function mockFetch(bytes: Uint8Array = FAKE_PNG_BYTES, mime = 'image/png') {
	vi.stubGlobal('fetch', vi.fn(async () => ({
		ok: true,
		status: 200,
		blob: async () => new Blob([bytes], { type: mime }),
	})));
}

// ─── buildBundle ──────────────────────────────────────────────────────────────

describe('buildBundle', () => {
	beforeEach(() => {
		vi.mocked(getApi).mockReset();
		vi.unstubAllGlobals();
	});

	it('manifest contains all expected fields', async () => {
		vi.mocked(getApi).mockReturnValue(makeApi({ sl: makeOverlayType({}) }) as any);
		mockFetch();

		const bundle = await buildBundle(
			[overlay('sl', [])],
			{ id: 'my-bundle', name: 'My Bundle', author: 'Tester', license: 'MIT', url: 'https://example.com' },
			'dnd5e',
		);

		expect(bundle.type).toBe('VMOverlayBundle');
		expect(bundle.version).toBe(1);
		expect(bundle.manifest.id).toBe('my-bundle');
		expect(bundle.manifest.name).toBe('My Bundle');
		expect(bundle.manifest.author).toBe('Tester');
		expect(bundle.manifest.license).toBe('MIT');
		expect(bundle.manifest.url).toBe('https://example.com');
		expect(bundle.manifest.obsUtilsMin).toBe('5.1.0');
		expect(bundle.system).toBe('dnd5e');
	});

	it('overlays have image paths rewritten to bundle:// scheme', async () => {
		const imgHandlers: ImageSlotHandlers = {
			extract: d => (d ? [d] : []),
			rewrite: (d, m) => m.get(d) ?? d,
		};
		vi.mocked(getApi).mockReturnValue(makeApi({
			sl: makeOverlayType({ img: imgHandlers }),
		}) as any);
		mockFetch();

		const bundle = await buildBundle(
			[overlay('sl', [{ type: 'img', data: 'worlds/test/hero.png' }])],
			{ id: 'b', name: 'B', author: 'A', license: 'CC0-1.0' },
			'dnd5e',
		);

		const comp = bundle.overlays[0].components[0];
		expect(comp.data).toBe('bundle://images/hero.png');
	});

	it('images map carries data URLs for each fetched image', async () => {
		const imgHandlers: ImageSlotHandlers = {
			extract: d => (d ? [d] : []),
			rewrite: (d, m) => m.get(d) ?? d,
		};
		vi.mocked(getApi).mockReturnValue(makeApi({
			sl: makeOverlayType({ img: imgHandlers }),
		}) as any);
		mockFetch();

		const bundle = await buildBundle(
			[overlay('sl', [{ type: 'img', data: 'worlds/test/hero.png' }])],
			{ id: 'b', name: 'B', author: 'A', license: 'CC0-1.0' },
			'pf2e',
		);

		expect(Object.keys(bundle.images)).toContain('hero.png');
		expect(bundle.images['hero.png']).toBe(FAKE_PNG_DATA_URL);
	});

	it('skips images that fail to fetch but still rewrites the path', async () => {
		const imgHandlers: ImageSlotHandlers = {
			extract: d => (d ? [d] : []),
			rewrite: (d, m) => m.get(d) ?? d,
		};
		vi.mocked(getApi).mockReturnValue(makeApi({
			sl: makeOverlayType({ img: imgHandlers }),
		}) as any);
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		const bundle = await buildBundle(
			[overlay('sl', [{ type: 'img', data: 'worlds/missing.png' }])],
			{ id: 'b', name: 'B', author: 'A', license: 'CC0-1.0' },
			'dnd5e',
		);

		expect(bundle.overlays[0].components[0].data).toBe('bundle://images/missing.png');
		expect(Object.keys(bundle.images)).not.toContain('missing.png');
	});

	it('resolves filename collisions by appending a counter', async () => {
		const imgHandlers: ImageSlotHandlers = {
			extract: d => (d ? [d] : []),
			rewrite: (d, m) => m.get(d) ?? d,
		};
		vi.mocked(getApi).mockReturnValue(makeApi({
			sl: makeOverlayType({ img: imgHandlers }),
		}) as any);
		mockFetch();

		// Two different paths that sanitize to the same filename
		const bundle = await buildBundle(
			[
				overlay('sl', [
					{ type: 'img', data: 'worlds/a/hero.png' },
					{ type: 'img', data: 'worlds/b/hero.png' },
				]),
			],
			{ id: 'b', name: 'B', author: 'A', license: 'CC0-1.0' },
			'dnd5e',
		);

		expect(Object.keys(bundle.images)).toContain('hero.png');
		expect(Object.keys(bundle.images)).toContain('hero-1.png');
	});
});
