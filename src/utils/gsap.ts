import type GSAPInstance from 'gsap';

// Foundry ships GSAP at `globalThis.gsap`. We import the npm package for types
// only — the actual runtime resolution always uses the host-provided global,
// so the module never bundles its own GSAP copy. The `gsap` package therefore
// lives in devDependencies, not dependencies.
const g = (globalThis as { gsap?: typeof GSAPInstance }).gsap;
if (!g) {
	console.error('obs-utils: globalThis.gsap is not defined. Foundry should expose GSAP — animations will not work.');
}
export default g as typeof GSAPInstance;

/**
 * Cubic-bezier ease for arbitrary (x1,y1,x2,y2) control points. Returned function
 * has the shape GSAP accepts as a custom `ease`. Replaces `gsap/CustomEase`,
 * which Foundry does not bundle.
 *
 * Newton-Raphson root-find on the x-component to recover t for a given x, then
 * evaluate the y-component at that t. Eight iterations is overkill at 60fps but
 * costs nothing.
 */
export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): (t: number) => number {
	function bezier(t: number, p1: number, p2: number): number {
		const u = 1 - t;
		return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
	}
	function bezierDeriv(t: number, p1: number, p2: number): number {
		const u = 1 - t;
		return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (1 - p2);
	}
	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let t = x;
		for (let i = 0; i < 8; i++) {
			const dx = bezier(t, p1x, p2x) - x;
			if (Math.abs(dx) < 1e-6) break;
			const dt = bezierDeriv(t, p1x, p2x);
			if (Math.abs(dt) < 1e-6) break;
			t = t - dx / dt;
		}
		return bezier(t, p1y, p2y);
	};
}
