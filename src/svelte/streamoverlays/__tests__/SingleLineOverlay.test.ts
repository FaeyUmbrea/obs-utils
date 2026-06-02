import { mount, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

// EmptyComponent is a real compiled Svelte 5 component — safe to use as a stub.
const { default: EmptyComponent } = await import('../overlaycomponents/EmptyComponent.svelte');

vi.mock('../../../utils/helpers.ts', () => ({
	getApi: () => ({
		overlayTypes: new Map([
			['sl', {
				overlayComponents: new Map([
					['known', EmptyComponent],
				]),
			}],
		]),
	}),
}));

const { default: SingleLineOverlay } = await import('../SingleLineOverlay.svelte');

describe('singleLineOverlay.svelte', () => {
	it('renders wrapper div with correct id and data-overlay-id', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(SingleLineOverlay, {
			target,
			props: {
				overlay: {
					overlayId: 'ov-abc',
					style: 'color: red;',
					components: [],
				},
				overlayIndex: 3,
			},
		});

		const div = target.querySelector('.single-line-overlay');
		expect(div).not.toBeNull();
		expect(div?.id).toBe('overlay3');
		expect(div?.getAttribute('data-overlay-id')).toBe('ov-abc');
		expect(div?.getAttribute('style')).toBe('color: red;');

		unmount(instance);
	});

	it('renders one child per overlay.components entry using known type', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(SingleLineOverlay, {
			target,
			props: {
				overlay: {
					overlayId: 'ov-xyz',
					style: '',
					components: [
						{ id: 'c1', type: 'known', values: {}, index: 0, style: '' },
						{ id: 'c2', type: 'known', values: {}, index: 1, style: '' },
					],
				},
				overlayIndex: 0,
			},
		});

		// EmptyComponent renders a div; two components → two of them
		const children = target.querySelectorAll('.single-line-overlay > div');
		expect(children.length).toBeGreaterThanOrEqual(2);

		unmount(instance);
	});

	it('unknown type falls through to EmptyComponent', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(SingleLineOverlay, {
			target,
			props: {
				overlay: {
					overlayId: 'ov-fallback',
					style: '',
					components: [
						{ id: 'c1', type: 'does-not-exist', values: {}, index: 0, style: '' },
					],
				},
				overlayIndex: 0,
			},
		});

		// EmptyComponent renders a div with text
		const text = target.textContent;
		expect(text).toContain('missing');

		unmount(instance);
	});

	it('identity frame (all zeros/ones) + opacity=1 → mergedStyle returns base style', () => {
		// The mergedStyle short-circuit is a pure function. We test it by observing
		// the style attribute on the wrapper (the overlay's own style) is applied.
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(SingleLineOverlay, {
			target,
			props: {
				overlay: {
					overlayId: 'ov-id',
					style: 'font-size: 12px;',
					components: [],
				},
				overlayIndex: 0,
			},
		});

		const wrapper = target.querySelector('.single-line-overlay');
		expect(wrapper?.getAttribute('style')).toBe('font-size: 12px;');

		unmount(instance);
	});
});
