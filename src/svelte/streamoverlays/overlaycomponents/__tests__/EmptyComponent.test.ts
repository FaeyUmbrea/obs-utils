import { describe, expect, it } from 'vitest';
import EmptyComponent from '../EmptyComponent.svelte';

describe('emptyComponent.svelte', () => {
	it('renders with the correct message', () => {
		// Create a target element to mount the component
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target');

		if (target === null) {
			throw new Error('Something went wrong');
		}
		// Create the component instance
		const component = new EmptyComponent({
			target,
		});

		// Check if the component renders the correct message
		const element = target.querySelector('div');
		expect(element).not.toBeNull();
		expect(element?.textContent).toBe('The component used to render this is missing.');

		// Clean up
		component.$destroy();
	});
});
