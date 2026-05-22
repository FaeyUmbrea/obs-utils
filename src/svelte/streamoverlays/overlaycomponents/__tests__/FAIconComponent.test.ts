import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import FAIconComponent from '../FAIconComponent.svelte';

describe('fAIconComponent.svelte', () => {
	it('renders with the correct class from values prop', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(FAIconComponent, {
			target,
			props: {
				values: { value: 'fa-solid fa-user' },
				style: 'color: red;',
				componentIndex: 1,
			},
		});

		const componentElement = target.querySelector('.component.fa-icon-component');
		expect(componentElement).not.toBeNull();

		expect(componentElement?.id).toBe('component1');

		expect(componentElement?.getAttribute('style')).toBe('color: red;');

		const icon = target.querySelector('i');
		expect(icon).not.toBeNull();
		expect(icon?.className).toBe('fa-solid fa-user');

		unmount(instance);
	});

	it('renders with a different class and style', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(FAIconComponent, {
			target,
			props: {
				values: { value: 'fa-regular fa-star' },
				style: 'font-size: 24px; background-color: blue;',
				componentIndex: 2,
			},
		});

		const componentElement = target.querySelector('.component.fa-icon-component');
		expect(componentElement).not.toBeNull();

		expect(componentElement?.id).toBe('component2');

		expect(componentElement?.getAttribute('style')).toBe('font-size: 24px; background-color: blue;');

		const icon = target.querySelector('i');
		expect(icon).not.toBeNull();
		expect(icon?.className).toBe('fa-regular fa-star');

		unmount(instance);
	});

	it('handles numeric componentIndex correctly', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(FAIconComponent, {
			target,
			props: {
				values: { value: 'fa-solid fa-check' },
				style: '',
				componentIndex: 0,
			},
		});

		const componentElement = target.querySelector('.component.fa-icon-component');
		expect(componentElement?.id).toBe('component0');

		unmount(instance);
	});
});
