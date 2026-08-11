import { describe, expect, it, vi } from 'vitest';

vi.mock('../combat.ts', () => ({ getCurrentCombatants: vi.fn(() => []) }));
vi.mock('../helpers.ts', () => ({
	getActiveGM: vi.fn(() => null),
	isOBS: vi.fn(() => false),
	sleep: vi.fn(async () => {}),
}));
vi.mock('../settings.ts', () => ({ getSetting: vi.fn(() => undefined) }));

const { tilesToScale } = await import('../canvas.ts');

describe('tilesToScale', () => {
	it('is grid-size independent for the same tile count', () => {
		// The whole point of the setting: 10 tiles across frames the same way
		// whether the map uses a 50px or a 200px grid.
		const coarse = tilesToScale(10, 1920, 200);
		const fine = tilesToScale(10, 1920, 50);
		expect(1920 / coarse / 200).toBeCloseTo(10);
		expect(1920 / fine / 50).toBeCloseTo(10);
	});

	it('inverts — more tiles visible is a smaller scale', () => {
		expect(tilesToScale(40, 1920, 100)).toBeLessThan(tilesToScale(10, 1920, 100));
	});

	it('scales with viewport width so a wider client sees the same tile count', () => {
		const hd = tilesToScale(10, 1920, 100);
		const qhd = tilesToScale(10, 2560, 100);
		expect(qhd).toBeGreaterThan(hd);
		expect(2560 / qhd / 100).toBeCloseTo(1920 / hd / 100);
	});

	it('produces the expected scale for the default Closest View', () => {
		// 10 tiles of a 100px grid across a 1920px viewport is 1000 canvas px
		// shown in 1920 screen px.
		expect(tilesToScale(10, 1920, 100)).toBeCloseTo(1.92);
	});
});
