import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import EmptyComponent from '../EmptyComponent.svelte';

describe('emptyComponent.svelte', () => {
	it('renders with the correct message', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target');

		if (target === null) {
			throw new Error('Something went wrong');
		}
		const instance = mount(EmptyComponent, { target });

		const element = target.querySelector('div');
		expect(element).not.toBeNull();
		expect(element?.textContent).toBe('The component used to render this is missing.');

		unmount(instance);
	});
});
