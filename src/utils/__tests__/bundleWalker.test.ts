import type { ImageSlotHandlers, OverlayType } from '../api.ts';
import type { OverlayData } from '../types.ts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sanitizeBundleFilename, walkBundleImageRefs } from '../bundleWalker.ts';
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

function makeOverlayType(slots: Record<string, ImageSlotHandlers>): OverlayType {
	const t = { overlayComponentImageSlots: new Map(Object.entries(slots)) } as unknown as OverlayType;
	return t;
}

function makeApi(types: Record<string, OverlayType>) {
	return { overlayTypes: new Map(Object.entries(types)) };
}

function overlay(type: string, components: { type: string; data: string }[]): OverlayData {
	return {
		id: 'test-overlay',
		type,
		components: components.map(c => ({ ...c, style: '', id: 'cid' })),
		style: '',
		config: {},
	} as unknown as OverlayData;
}

// ─── walkBundleImageRefs ──────────────────────────────────────────────────────

describe('walkBundleImageRefs', () => {
	beforeEach(() => {
		vi.mocked(getApi).mockReset();
	});

	it('returns the correct ref for a single img component', () => {
		const imgHandlers: ImageSlotHandlers = {
			extract: d => (d ? [d] : []),
			rewrite: (d, m) => m.get(d) ?? d,
		};
		vi.mocked(getApi).mockReturnValue(makeApi({
			sl: makeOverlayType({ img: imgHandlers }),
		}) as any);

		const { refs } = walkBundleImageRefs([
			overlay('sl', [{ type: 'img', data: 'worlds/test/images/hero.png' }]),
		]);

		expect(refs.has('worlds/test/images/hero.png')).toBe(true);
		expect(refs.get('worlds/test/images/hero.png')).toHaveLength(1);
		expect(refs.get('worlds/test/images/hero.png')![0].componentIndex).toBe(0);
	});

	it('returns both refs for a bavimg component', () => {
		const bavimgHandlers: ImageSlotHandlers = {
			extract: (d) => {
				const parts = d.split(';');
				return [parts[1], parts[2]].filter(p => p && p.length > 0);
			},
			rewrite: (d, m) => {
				const parts = d.split(';');
				if (parts[1]) parts[1] = m.get(parts[1]) ?? parts[1];
				if (parts[2]) parts[2] = m.get(parts[2]) ?? parts[2];
				return parts.join(';');
			},
		};
		vi.mocked(getApi).mockReturnValue(makeApi({
			sl: makeOverlayType({ bavimg: bavimgHandlers }),
		}) as any);

		const { refs } = walkBundleImageRefs([
			overlay('sl', [{ type: 'bavimg', data: 'system.attributes.hp.value;worlds/true.png;worlds/false.png' }]),
		]);

		expect(refs.has('worlds/true.png')).toBe(true);
		expect(refs.has('worlds/false.png')).toBe(true);
		expect(refs.size).toBe(2);
	});

	it('skips empty strings', () => {
		const imgHandlers: ImageSlotHandlers = {
			extract: d => (d ? [d] : []),
			rewrite: (d, m) => m.get(d) ?? d,
		};
		vi.mocked(getApi).mockReturnValue(makeApi({
			sl: makeOverlayType({ img: imgHandlers }),
		}) as any);

		const { refs } = walkBundleImageRefs([
			overlay('sl', [{ type: 'img', data: '' }]),
		]);

		expect(refs.size).toBe(0);
	});

	it('skips obvious non-paths like system.attributes.hp.value', () => {
		const ptHandlers: ImageSlotHandlers = {
			extract: d => [d],
			rewrite: (d, m) => m.get(d) ?? d,
		};
		vi.mocked(getApi).mockReturnValue(makeApi({
			sl: makeOverlayType({ pt: ptHandlers }),
		}) as any);

		const { refs } = walkBundleImageRefs([
			overlay('sl', [{ type: 'pt', data: 'system.attributes.hp.value' }]),
		]);

		expect(refs.size).toBe(0);
	});

	it('skips paths already starting with bundle://', () => {
		const imgHandlers: ImageSlotHandlers = {
			extract: d => (d ? [d] : []),
			rewrite: (d, m) => m.get(d) ?? d,
		};
		vi.mocked(getApi).mockReturnValue(makeApi({
			sl: makeOverlayType({ img: imgHandlers }),
		}) as any);

		const { refs } = walkBundleImageRefs([
			overlay('sl', [{ type: 'img', data: 'bundle://images/hero.png' }]),
		]);

		expect(refs.size).toBe(0);
	});
});

// ─── sanitizeBundleFilename ───────────────────────────────────────────────────

describe('sanitizeBundleFilename', () => {
	it('strips directory prefix', () => {
		expect(sanitizeBundleFilename('worlds/myworld/images/hero.png')).toBe('hero.png');
	});

	it('replaces spaces with dashes', () => {
		expect(sanitizeBundleFilename('worlds/images/Frame Parchment.png')).toBe('Frame-Parchment.png');
	});

	it('replaces parentheses and their content characters', () => {
		expect(sanitizeBundleFilename('worlds/images/Frame-Parchment (1).png')).toBe('Frame-Parchment-1-.png');
	});

	it('collapses repeated dashes', () => {
		expect(sanitizeBundleFilename('a/b--c___d.png')).toBe('b-c-d.png');
	});

	it('preserves case', () => {
		expect(sanitizeBundleFilename('worlds/MyHeroImage.PNG')).toBe('MyHeroImage.PNG');
	});

	it('handles no directory separator', () => {
		expect(sanitizeBundleFilename('hero.png')).toBe('hero.png');
	});

	it('handles http URLs', () => {
		expect(sanitizeBundleFilename('https://example.com/assets/bg image.webp')).toBe('bg-image.webp');
	});
});
