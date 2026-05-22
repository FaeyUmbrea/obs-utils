import type { ActorValueGroup } from '../helpers.ts';
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
vi.mock('../defaultOverlays.ts', () => ({ getExampleOverlay: vi.fn(() => []) }));

function stubI18n(mock?: (key: string) => string) {
	vi.stubGlobal('game', {
		i18n: {
			localize: mock ?? ((k: string) => `localized:${k}`),
		},
	});
}

// Late import — must come after the mocks above.
async function loadHelpers() {
	return await import('../helpers.ts');
}

// ─── setActorValuesGrouped ────────────────────────────────────────────────────

describe('setActorValuesGrouped', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		stubI18n();
	});

	it('sorts groups by order', async () => {
		const h = await loadHelpers();
		const groups: ActorValueGroup[] = [
			{ label: 'b', order: 30, items: [{ value: 'b1', label: 'b1' }] },
			{ label: 'a', order: 10, items: [{ value: 'a1', label: 'a1' }] },
			{ label: 'c', order: 20, items: [{ value: 'c1', label: 'c1' }] },
		];
		h.setActorValuesGrouped(groups);
		const out = h.getActorValueGroups();
		expect(out.map(g => g.items[0].value)).toEqual(['a1', 'c1', 'b1']);
	});

	it('treats order=undefined as 100 (lands after lower-numbered groups)', async () => {
		const h = await loadHelpers();
		h.setActorValuesGrouped([
			{ label: 'no-order', items: [{ value: 'x', label: 'x' }] },
			{ label: 'low', order: 5, items: [{ value: 'y', label: 'y' }] },
		]);
		const out = h.getActorValueGroups();
		expect(out.map(g => g.items[0].value)).toEqual(['y', 'x']);
	});

	it('preserves insertion order for groups with the same order value', async () => {
		const h = await loadHelpers();
		h.setActorValuesGrouped([
			{ label: 'first', order: 10, items: [{ value: '1', label: '1' }] },
			{ label: 'second', order: 10, items: [{ value: '2', label: '2' }] },
			{ label: 'third', order: 10, items: [{ value: '3', label: '3' }] },
		]);
		const out = h.getActorValueGroups();
		expect(out.map(g => g.items[0].value)).toEqual(['1', '2', '3']);
	});

	it('localizes group labels once at set time', async () => {
		const localize = vi.fn((k: string) => `LOC:${k}`);
		stubI18n(localize);
		const h = await loadHelpers();
		h.setActorValuesGrouped([
			{ label: 'i18n.key.a', items: [{ value: 'x', label: 'x' }] },
			{ label: 'i18n.key.b', items: [{ value: 'y', label: 'y' }] },
		]);
		expect(localize).toHaveBeenCalledWith('i18n.key.a');
		expect(localize).toHaveBeenCalledWith('i18n.key.b');
		const out = h.getActorValueGroups();
		expect(out[0].label).toBe('LOC:i18n.key.a');
		expect(out[1].label).toBe('LOC:i18n.key.b');
		// And calling getActorValueGroups again doesn't re-localize.
		const callCountAfterSet = localize.mock.calls.length;
		h.getActorValueGroups();
		expect(localize.mock.calls.length).toBe(callCountAfterSet);
	});

	it('getActorValues (flat) returns merged items in group order', async () => {
		const h = await loadHelpers();
		h.setActorValuesGrouped([
			{ label: 'g1', order: 10, items: [{ value: 'a', label: 'a' }, { value: 'b', label: 'b' }] },
			{ label: 'g2', order: 20, items: [{ value: 'c', label: 'c' }] },
		]);
		expect(h.getActorValues().map(v => v.value)).toEqual(['a', 'b', 'c']);
	});
});

// ─── ensureCustomValue ────────────────────────────────────────────────────────

describe('ensureCustomValue', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		stubI18n();
	});

	it('returns input unchanged when path is empty', async () => {
		const h = await loadHelpers();
		const groups: ActorValueGroup[] = [{ label: 'g', items: [{ value: 'a', label: 'a' }] }];
		expect(h.ensureCustomValue(groups, '')).toBe(groups);
		expect(h.ensureCustomValue(groups, null)).toBe(groups);
		expect(h.ensureCustomValue(groups, undefined)).toBe(groups);
	});

	it('returns input unchanged when path is already in a registered group', async () => {
		const h = await loadHelpers();
		const groups: ActorValueGroup[] = [
			{ label: 'g', items: [{ value: 'system.hp.value', label: 'HP' }] },
		];
		expect(h.ensureCustomValue(groups, 'system.hp.value')).toBe(groups);
	});

	it('appends a Custom group when path is unknown', async () => {
		const h = await loadHelpers();
		const groups: ActorValueGroup[] = [
			{ label: 'g', items: [{ value: 'a', label: 'a' }] },
		];
		const out = h.ensureCustomValue(groups, 'unknown.path');
		expect(out.length).toBe(2);
		expect(out[1].items).toEqual([{ value: 'unknown.path', label: 'unknown.path', $created: true }]);
	});

	it('reuses the same Custom group on a second call with a different unknown path', async () => {
		const h = await loadHelpers();
		const groups: ActorValueGroup[] = [
			{ label: 'g', items: [{ value: 'a', label: 'a' }] },
		];
		const localize = vi.fn((k: string) => k);
		stubI18n(localize);
		const customLabel = (game.i18n as any).localize('obs-utils.strings.customGroup');
		const after1 = h.ensureCustomValue(groups, 'first.unknown');
		const after2 = h.ensureCustomValue(after1, 'second.unknown');
		// Single Custom group, two items
		const customGroups = after2.filter(g => g.label === customLabel);
		expect(customGroups.length).toBe(1);
		expect(customGroups[0].items.map(i => i.value)).toContain('first.unknown');
		expect(customGroups[0].items.map(i => i.value)).toContain('second.unknown');
	});
});
