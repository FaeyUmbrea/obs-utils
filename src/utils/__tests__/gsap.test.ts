import { describe, expect, it } from 'vitest';
import { cubicBezier } from '../gsap.ts';

describe('cubicBezier', () => {
	it('identity bezier (0,0,1,1) is approximately the identity function', () => {
		const f = cubicBezier(0, 0, 1, 1);
		for (const x of [0.1, 0.25, 0.5, 0.75, 0.9]) {
			expect(Math.abs(f(x) - x)).toBeLessThan(0.01);
		}
	});

	it('clamps inputs ≤ 0 to 0', () => {
		const f = cubicBezier(0.42, 0, 0.58, 1);
		expect(f(0)).toBe(0);
		expect(f(-0.5)).toBe(0);
		expect(f(-1)).toBe(0);
	});

	it('clamps inputs ≥ 1 to 1', () => {
		const f = cubicBezier(0.42, 0, 0.58, 1);
		expect(f(1)).toBe(1);
		expect(f(1.5)).toBe(1);
		expect(f(2)).toBe(1);
	});

	it('symmetric ease-in-out passes through (0.5, ~0.5)', () => {
		const f = cubicBezier(0.42, 0, 0.58, 1);
		expect(Math.abs(f(0.5) - 0.5)).toBeLessThan(0.02);
	});

	it('is monotonically non-decreasing across a well-behaved curve', () => {
		const f = cubicBezier(0.25, 0.1, 0.25, 1);
		let prev = f(0);
		for (let i = 1; i <= 20; i++) {
			const cur = f(i / 20);
			expect(cur).toBeGreaterThanOrEqual(prev - 1e-6);
			prev = cur;
		}
	});

	it('returns a function (suitable for GSAP\'s ease parameter)', () => {
		const f = cubicBezier(0.42, 0, 0.58, 1);
		expect(typeof f).toBe('function');
	});

	it('handles ease-out (slow finish) bezier — value at t=0.5 is above 0.5', () => {
		// Material-style ease-out: starts fast, slows toward the end.
		const f = cubicBezier(0.0, 0.0, 0.2, 1.0);
		expect(f(0.5)).toBeGreaterThan(0.5);
	});

	it('handles ease-in (slow start) bezier — value at t=0.5 is below 0.5', () => {
		// Material-style ease-in: starts slow, accelerates toward the end.
		const f = cubicBezier(0.8, 0.0, 1.0, 1.0);
		expect(f(0.5)).toBeLessThan(0.5);
	});
});
