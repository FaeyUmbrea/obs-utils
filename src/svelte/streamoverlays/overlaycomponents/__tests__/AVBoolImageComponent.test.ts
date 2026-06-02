import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import AVBoolImageComponent from '../AVBoolImageComponent.svelte';

describe('aVBoolImageComponent.svelte', () => {
	it('renders image1 when value is truthy', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVBoolImageComponent, {
			target,
			props: {
				values: { value: true, image1: 'icon1.png' },
				style: '',
				componentIndex: 0,
			},
		});

		const img = target.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.src).toContain('icon1.png');

		unmount(instance);
	});

	it('renders image2 when value is falsy', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVBoolImageComponent, {
			target,
			props: {
				values: { value: false, image2: 'icon2.png' },
				style: '',
				componentIndex: 0,
			},
		});

		const img = target.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.src).toContain('icon2.png');

		unmount(instance);
	});

	it('renders no img when truthy but image1 is empty', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVBoolImageComponent, {
			target,
			props: {
				values: { value: true, image1: '' },
				style: '',
				componentIndex: 0,
			},
		});

		const img = target.querySelector('img');
		expect(img).toBeNull();

		unmount(instance);
	});
});
