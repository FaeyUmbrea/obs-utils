import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import AVMultiIconComponent from '../AVMultiIconComponent.svelte';

describe('aVMultiIconComponent.svelte', () => {
	it('renders multiple icons with correct classes', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVMultiIconComponent, {
			target,
			props: {
				values: { value1: 2, value2: 3, icon1: 'fa a', icon2: 'fa b' },
				style: '',
				componentIndex: 0,
			},
		});

		const icons = target.querySelectorAll('i');
		expect(icons.length).toBe(5);
		expect(icons[0].className).toContain('fa a');
		expect(icons[0].className).toContain('icon-1');
		expect(icons[1].className).toContain('fa a');
		expect(icons[1].className).toContain('icon-2');
		expect(icons[2].className).toContain('fa b');
		expect(icons[2].className).toContain('icon-3');
		expect(icons[3].className).toContain('fa b');
		expect(icons[3].className).toContain('icon-4');
		expect(icons[4].className).toContain('fa b');
		expect(icons[4].className).toContain('icon-5');

		unmount(instance);
	});

	it('renders no icons when both values are zero', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(AVMultiIconComponent, {
			target,
			props: {
				values: { value1: 0, value2: 0 },
				style: '',
				componentIndex: 0,
			},
		});

		const icons = target.querySelectorAll('i');
		expect(icons.length).toBe(0);

		unmount(instance);
	});
});
