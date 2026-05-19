import type { ImageSlotHandlers } from '../api.ts';
import type { OverlayData } from '../types.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importBundle, validateBundle } from '../bundleImporter.ts';
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

// ─── Globals validateBundle expects ───────────────────────────────────────────

function stubGame() {
	vi.stubGlobal('game', {
		i18n: {
			format: (key: string, data?: Record<string, string>) =>
				`${key}|${data ? JSON.stringify(data) : ''}`,
		},
	});
}

function stubFoundry(randomIds = ['id1', 'id2', 'id3', 'id4', 'id5', 'id6']) {
	const queue = [...randomIds];
	vi.stubGlobal('foundry', {
		utils: {
			randomID: () => queue.shift() ?? `id-${Math.random().toString(36).slice(2, 8)}`,
		},
	});
}

function stubUploadPersistent(returnPath: (filename: string) => string = f => `modules/obs-utils/bundles/test/${f}`) {
	const upload = vi.fn(async (_mod: string, _sub: string, file: File) => ({
		path: returnPath(file.name),
	}));
	vi.stubGlobal('FilePicker', { uploadPersistent: upload });
	return upload;
}

// Minimal image-slot handlers for the 'img' component type — same shape as the
// real api.ts registration.
const imgHandlers: ImageSlotHandlers = {
	extract: d => (d ? [d] : []),
	rewrite: (d, m) => m.get(d) ?? d,
};

function makeApi(slotsByType: Record<string, Record<string, ImageSlotHandlers>>) {
	const types = new Map();
	for (const [overlayType, slots] of Object.entries(slotsByType)) {
		types.set(overlayType, {
			overlayComponentImageSlots: new Map(Object.entries(slots)),
		});
	}
	return { overlayTypes: types };
}

function makeBundle(overrides: Record<string, any> = {}) {
	return {
		type: 'VMOverlayBundle',
		version: 1,
		manifest: { id: 'test-bundle', name: 'Test', author: 'A', license: 'MIT' },
		system: 'dnd5e',
		overlays: [],
		images: {},
		...overrides,
	};
}

const TINY_PNG_DATA_URL = `data:image/png;base64,${btoa('\x89PNG\r\n\x1A\n')}`;

// ─── validateBundle ──────────────────────────────────────────────────────────

describe('validateBundle', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		stubGame();
	});

	it('accepts a well-formed bundle', () => {
		expect(() => validateBundle(makeBundle())).not.toThrow();
	});

	it('rejects wrong type field', () => {
		expect(() => validateBundle({ ...makeBundle(), type: 'NotABundle' })).toThrow(/missing or wrong type/);
	});

	it('rejects missing version', () => {
		const bad = makeBundle();
		delete bad.version;
		expect(() => validateBundle(bad)).toThrow(/missing version/);
	});

	it('rejects missing manifest', () => {
		const bad = makeBundle();
		delete bad.manifest;
		expect(() => validateBundle(bad)).toThrow(/missing manifest/);
	});

	it('rejects manifest without id', () => {
		expect(() => validateBundle(makeBundle({ manifest: { name: 'X' } }))).toThrow(/manifest\.id/);
	});

	it('rejects non-array overlays', () => {
		expect(() => validateBundle(makeBundle({ overlays: 'nope' }))).toThrow(/overlays/);
	});

	it('rejects non-object images', () => {
		expect(() => validateBundle(makeBundle({ images: [] }))).toThrow(/images/);
	});

	it('rejects null', () => {
		expect(() => validateBundle(null)).toThrow();
	});
});

// ─── importBundle ────────────────────────────────────────────────────────────

describe('importBundle', () => {
	beforeEach(() => {
		vi.mocked(getApi).mockReset();
		vi.unstubAllGlobals();
		stubGame();
		stubFoundry();
	});

	function overlay(type: string, components: { type: string; data: string }[]): OverlayData {
		return {
			id: 'original',
			type,
			components: components.map((c, i) => ({ ...c, style: '', id: `orig-c${i}` })),
			style: '',
			config: {},
		} as unknown as OverlayData;
	}

	it('uploads each image and returns the uploaded path map', async () => {
		const upload = stubUploadPersistent();
		vi.mocked(getApi).mockReturnValue(makeApi({ wysiwyg: { img: imgHandlers } }) as any);

		const bundle = makeBundle({
			images: { 'frame.png': TINY_PNG_DATA_URL },
		});

		const result = await importBundle(bundle as any);
		expect(upload).toHaveBeenCalledTimes(1);
		expect(result.uploadedPaths.get('bundle://images/frame.png')).toBe(
			'modules/obs-utils/bundles/test/frame.png',
		);
		expect(result.failedImages).toEqual([]);
	});

	it('rewrites component data with the uploaded path', async () => {
		stubUploadPersistent();
		vi.mocked(getApi).mockReturnValue(makeApi({ wysiwyg: { img: imgHandlers } }) as any);

		const bundle = makeBundle({
			overlays: [overlay('wysiwyg', [{ type: 'img', data: 'bundle://images/frame.png' }])],
			images: { 'frame.png': TINY_PNG_DATA_URL },
		});

		const result = await importBundle(bundle as any);
		expect(result.overlays[0].components[0].data).toBe(
			'modules/obs-utils/bundles/test/frame.png',
		);
	});

	it('stamps fresh IDs on overlays and components', async () => {
		stubUploadPersistent();
		vi.mocked(getApi).mockReturnValue(makeApi({ wysiwyg: { img: imgHandlers } }) as any);

		const bundle = makeBundle({
			overlays: [overlay('wysiwyg', [{ type: 'img', data: 'bundle://images/frame.png' }])],
			images: { 'frame.png': TINY_PNG_DATA_URL },
		});

		const result = await importBundle(bundle as any);
		expect(result.overlays[0].id).not.toBe('original');
		expect(result.overlays[0].components[0].id).not.toBe('orig-c0');
	});

	it('continues on per-image upload failure and reports it', async () => {
		vi.stubGlobal('FilePicker', {
			uploadPersistent: vi.fn(async (_m: string, _s: string, file: File) => {
				if (file.name === 'broken.png') throw new Error('upload failed');
				return { path: `modules/obs-utils/bundles/test/${file.name}` };
			}),
		});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.mocked(getApi).mockReturnValue(makeApi({ wysiwyg: { img: imgHandlers } }) as any);

		const bundle = makeBundle({
			images: {
				'ok.png': TINY_PNG_DATA_URL,
				'broken.png': TINY_PNG_DATA_URL,
			},
		});

		const result = await importBundle(bundle as any);
		expect(result.uploadedPaths.size).toBe(1);
		expect(result.failedImages).toEqual(['broken.png']);
	});
});
