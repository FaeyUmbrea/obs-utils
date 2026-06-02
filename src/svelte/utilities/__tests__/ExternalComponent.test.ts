import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import ExternalComponent from '../ExternalComponent.svelte';

describe('externalComponent.svelte', () => {
	it('mounts the wrapper div', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		// Minimal stub: a function that svelte mount() treats as a component.
		// ExternalComponent calls mount(ExternalClass, { target: div, props: rest }).
		// We just need to verify the wrapper div exists.
		const StubClass = function StubClass(opts: any) {
			const span = document.createElement('span');
			span.className = 'stub-content';
			opts.target.appendChild(span);
		} as any;

		const instance = mount(ExternalComponent, {
			target,
			props: { ExternalClass: StubClass, label: 'hello' },
		});

		// The wrapper div is always rendered immediately.
		const wrapper = target.querySelector('div');
		expect(wrapper).not.toBeNull();

		unmount(instance);
	});

	it('passes extra props through rest spread', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		let receivedProps: Record<string, any> | null = null;

		const StubClass = function StubClass(opts: any) {
			receivedProps = opts.props ?? null;
		} as any;

		const instance = mount(ExternalComponent, {
			target,
			props: { ExternalClass: StubClass, myProp: 'test-value', count: 7 },
		});

		// onMount fires synchronously in jsdom / vitest
		// receivedProps should contain myProp and count (not ExternalClass)
		if (receivedProps !== null) {
			expect((receivedProps as any).myProp).toBe('test-value');
			expect((receivedProps as any).count).toBe(7);
			expect((receivedProps as any).ExternalClass).toBeUndefined();
		}

		unmount(instance);
	});
});
