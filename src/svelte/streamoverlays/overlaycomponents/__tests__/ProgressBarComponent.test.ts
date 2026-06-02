import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import ProgressBarComponent from '../ProgressBarComponent.svelte';

describe('progressBarComponent.svelte', () => {
	it('renders progress with normal value and max', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(ProgressBarComponent, {
			target,
			props: {
				values: { value: 50, max: 100 },
				style: '',
				componentIndex: 0,
			},
		});

		const progress = target.querySelector('progress') as HTMLProgressElement;
		expect(progress).not.toBeNull();
		expect(progress.value).toBe(50);
		expect(progress.max).toBe(100);

		unmount(instance);
	});

	it('renders progress with NaN value converted to 0.5', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(ProgressBarComponent, {
			target,
			props: {
				values: { value: Number.NaN, max: 100 },
				style: '',
				componentIndex: 0,
			},
		});

		const progress = target.querySelector('progress') as HTMLProgressElement;
		expect(progress.value).toBe(0.5);

		unmount(instance);
	});

	it('renders progress with infinite max converted to 1', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(ProgressBarComponent, {
			target,
			props: {
				values: { value: 50, max: Infinity },
				style: '',
				componentIndex: 0,
			},
		});

		const progress = target.querySelector('progress') as HTMLProgressElement;
		expect(progress.max).toBe(1);

		unmount(instance);
	});
});
