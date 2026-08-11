import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSetting = vi.fn();
vi.mock('../settings.ts', () => ({ getSetting: (k: string) => getSetting(k) }));

const { resolveLevelForTokens, tokensOnLevel } = await import('../levels.ts');

/**
 * Floors are ordered by elevation. `sort` is deliberately 0 on every level here
 * because that is what real scenes look like — all four floors of The Restored
 * Keep ship with `sort: 0` — so ordering by `sort` would silently fall back to
 * insertion order and these tests would pass while the feature was broken.
 */
function stubScene(levelIds: string[]) {
	const contents = levelIds.map((id, i) => ({ id, sort: 0, elevation: { bottom: i * 20 } }));
	vi.stubGlobal('game', {
		canvas: {
			scene: { id: 'scene1', levels: { contents, get: (id: string) => contents.find(l => l.id === id) } },
			tokens: { get: () => undefined },
		},
	});
}

function token(level: string) {
	return { document: { _source: { level } } } as any;
}

function settings(overrides: Record<string, unknown> = {}) {
	const values: Record<string, unknown> = { levelPolicy: 'relative', levelRelativeRule: 'lowest', levelPins: {}, ...overrides };
	getSetting.mockImplementation((k: string) => values[k]);
}

describe('resolveLevelForTokens', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
		getSetting.mockReset();
	});

	it('returns undefined when the scene has no levels, so v13 is untouched', () => {
		stubScene([]);
		settings();
		expect(resolveLevelForTokens([token('a')])).toBeUndefined();
	});

	it('picks the lowest occupied floor', () => {
		stubScene(['a', 'b', 'c']);
		settings({ levelRelativeRule: 'lowest' });
		expect(resolveLevelForTokens([token('c'), token('b')])).toBe('b');
	});

	it('picks the highest occupied floor', () => {
		stubScene(['a', 'b', 'c']);
		settings({ levelRelativeRule: 'highest' });
		expect(resolveLevelForTokens([token('a'), token('b')])).toBe('b');
	});

	it('never picks an empty floor for "middle"', () => {
		// The failure this guards: tokens on the first and third floors with
		// nothing on the second. Taking the midpoint of the whole range would
		// select 'b', which holds no tracked token — empty bounds, frozen camera.
		stubScene(['a', 'b', 'c']);
		settings({ levelRelativeRule: 'middle' });
		const chosen = resolveLevelForTokens([token('a'), token('c')]);
		expect(chosen).not.toBe('b');
		expect(['a', 'c']).toContain(chosen);
	});

	it('takes the middle of three occupied floors', () => {
		stubScene(['a', 'b', 'c']);
		settings({ levelRelativeRule: 'middle' });
		expect(resolveLevelForTokens([token('a'), token('b'), token('c')])).toBe('b');
	});

	it('returns undefined when nothing is tracked', () => {
		stubScene(['a', 'b']);
		settings();
		expect(resolveLevelForTokens([])).toBeUndefined();
	});

	it('falls back to the relative rule when a pinned floor is unset', () => {
		// Pinned must always degrade to `relative`, which is why `relative` has
		// to resolve for every input.
		stubScene(['a', 'b']);
		settings({ levelPolicy: 'pinned', levelPins: {}, levelRelativeRule: 'highest' });
		expect(resolveLevelForTokens([token('a'), token('b')])).toBe('b');
	});
});

describe('tokensOnLevel', () => {
	it('drops tokens from other floors so the bounding box cannot straddle', () => {
		const here = token('a');
		expect(tokensOnLevel([here, token('b')], 'a')).toEqual([here]);
	});

	it('passes everything through when there is no chosen floor', () => {
		const all = [token('a'), token('b')];
		expect(tokensOnLevel(all, undefined)).toBe(all);
	});

	it('keeps the full set rather than framing nothing', () => {
		// Framing the wrong floor beats freezing: empty bounds make
		// trackTokenList bail and the camera stops moving entirely.
		const all = [token('a'), token('b')];
		expect(tokensOnLevel(all, 'c')).toBe(all);
	});
});
