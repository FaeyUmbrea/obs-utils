import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import AVBoolIconComponent from '../AVBoolIconComponent.svelte';

describe('aVBoolIconComponent.svelte', () => {
	it('renders icon1 with fallback when value is truthy', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVBoolIconComponent, {
			target,
			props: {
				values: { value: true, icon1: 'fa-solid fa-star' },
				style: '',
				componentIndex: 0,
			},
		});

		const icon = target.querySelector('i');
		expect(icon).not.toBeNull();
		expect(icon?.className).toBe('fa-solid fa-star');

		unmount(instance);
	});

	it('renders icon1 fallback when truthy but icon1 missing', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVBoolIconComponent, {
			target,
			props: {
				values: { value: 1 },
				style: '',
				componentIndex: 0,
			},
		});

		const icon = target.querySelector('i');
		expect(icon?.className).toBe('fa-solid fa-check');

		unmount(instance);
	});

	it('renders icon2 with fallback when value is falsy', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVBoolIconComponent, {
			target,
			props: {
				values: { value: false, icon2: 'fa-solid fa-times' },
				style: '',
				componentIndex: 0,
			},
		});

		const icon = target.querySelector('i');
		expect(icon?.className).toBe('fa-solid fa-times');

		unmount(instance);
	});
});
