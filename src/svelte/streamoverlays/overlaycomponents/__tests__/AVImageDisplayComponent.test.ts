import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import AVImageDisplayComponent from '../AVImageDisplayComponent.svelte';

describe('aVImageDisplayComponent.svelte', () => {
	it('renders img with value as src', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVImageDisplayComponent, {
			target,
			props: {
				values: { value: 'test-image.png' },
				style: '',
				componentIndex: 0,
			},
		});

		const img = target.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.src).toContain('test-image.png');

		unmount(instance);
	});

	it('renders img with empty src when value is missing', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVImageDisplayComponent, {
			target,
			props: {
				values: {},
				style: '',
				componentIndex: 0,
			},
		});

		const img = target.querySelector('img');
		expect(img).not.toBeNull();
		expect(img?.src).toContain('');

		unmount(instance);
	});
});
