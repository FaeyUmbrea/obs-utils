import { describe, expect, it } from 'vitest';
import FAIconComponent from '../FAIconComponent.svelte';

describe('fAIconComponent.svelte', () => {
	it('renders with the correct class from data prop', () => {
		// Create a target element to mount the component
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target');

		// Create the component instance
		const component = new FAIconComponent({
			target,
			props: {
				data: 'fa-solid fa-user',
				style: 'color: red;',
				componentIndex: 1,
			},
		});

		// Check if the component has the correct class
		const componentElement = target.querySelector('.component.fa-icon-component');
		expect(componentElement).not.toBeNull();

		// Check if the component has the correct ID
		expect(componentElement?.id).toBe('component1');

		// Check if the component has the correct style
		expect(componentElement?.getAttribute('style')).toBe('color: red;');

		// Check if the icon has the correct class
		const icon = target.querySelector('i');
		expect(icon).not.toBeNull();
		expect(icon?.className).toBe('fa-solid fa-user');

		// Clean up
		component.$destroy();
	});

	it('renders with a different class and style', () => {
		// Create a target element to mount the component
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target');

		// Create the component instance
		const component = new FAIconComponent({
			target,
			props: {
				data: 'fa-regular fa-star',
				style: 'font-size: 24px; background-color: blue;',
				componentIndex: 2,
			},
		});

		// Check if the component has the correct class
		const componentElement = target.querySelector('.component.fa-icon-component');
		expect(componentElement).not.toBeNull();

		// Check if the component has the correct ID
		expect(componentElement?.id).toBe('component2');

		// Check if the component has the correct style
		expect(componentElement?.getAttribute('style')).toBe('font-size: 24px; background-color: blue;');

		// Check if the icon has the correct class
		const icon = target.querySelector('i');
		expect(icon).not.toBeNull();
		expect(icon?.className).toBe('fa-regular fa-star');

		// Clean up
		component.$destroy();
	});

	it('handles numeric componentIndex correctly', () => {
		// Create a target element to mount the component
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target');

		// Create the component instance
		const component = new FAIconComponent({
			target,
			props: {
				data: 'fa-solid fa-check',
				style: '',
				componentIndex: 0,
			},
		});

		// Check if the component has the correct ID with numeric index
		const componentElement = target.querySelector('.component.fa-icon-component');
		expect(componentElement?.id).toBe('component0');

		// Clean up
		component.$destroy();
	});
});
