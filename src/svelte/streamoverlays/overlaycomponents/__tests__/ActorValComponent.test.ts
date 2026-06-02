import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import ActorValComponent from '../ActorValComponent.svelte';

describe('actorValComponent.svelte', () => {
	it('renders string value as text', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(ActorValComponent, {
			target,
			props: {
				values: { value: 'test string' },
				style: '',
				componentIndex: 0,
			},
		});

		const component = target.querySelector('.component');
		expect(component?.textContent).toBe('test string');

		unmount(instance);
	});

	it('renders null value as empty', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(ActorValComponent, {
			target,
			props: {
				values: { value: null },
				style: '',
				componentIndex: 0,
			},
		});

		const component = target.querySelector('.component');
		expect(component?.textContent).toBe('');

		unmount(instance);
	});

	it('renders number value as text', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(ActorValComponent, {
			target,
			props: {
				values: { value: 42 },
				style: '',
				componentIndex: 0,
			},
		});

		const component = target.querySelector('.component');
		expect(component?.textContent).toBe('42');

		unmount(instance);
	});
});
