import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import AVMultiImageComponent from '../AVMultiImageComponent.svelte';

describe('aVMultiImageComponent.svelte', () => {
	it('renders multiple images with correct sources', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVMultiImageComponent, {
			target,
			props: {
				values: { value1: 1, value2: 2, image1: 'a.png', image2: 'b.png' },
				style: '',
				componentIndex: 0,
			},
		});

		const imgs = target.querySelectorAll('img');
		expect(imgs.length).toBe(3);
		expect(imgs[0].src).toContain('a.png');
		expect(imgs[1].src).toContain('b.png');
		expect(imgs[2].src).toContain('b.png');

		unmount(instance);
	});

	it('renders no images when both values are zero', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVMultiImageComponent, {
			target,
			props: {
				values: { value1: 0, value2: 0 },
				style: '',
				componentIndex: 0,
			},
		});

		const imgs = target.querySelectorAll('img');
		expect(imgs.length).toBe(0);

		unmount(instance);
	});
});
