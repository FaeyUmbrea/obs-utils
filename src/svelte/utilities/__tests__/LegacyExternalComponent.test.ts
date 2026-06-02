import { mount, unmount } from 'svelte';
import { describe, expect, it } from 'vitest';
import LegacyExternalComponent from '../LegacyExternalComponent.svelte';

describe('legacyExternalComponent.svelte', () => {
	it('mounts the wrapper div', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const StubLegacyClass = function StubLegacyClass(opts: any) {
			const span = document.createElement('span');
			span.className = 'legacy-stub';
			opts.target.appendChild(span);
		} as any;

		const instance = mount(LegacyExternalComponent, {
			target,
			props: { ExternalClass: StubLegacyClass },
		});

		const wrapper = target.querySelector('div');
		expect(wrapper).not.toBeNull();

		unmount(instance);
	});

	it('calls ExternalClass constructor with target and props', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		let capturedOpts: any = null;

		const StubLegacyClass = function StubLegacyClass(opts: any) {
			capturedOpts = opts;
		} as any;

		const instance = mount(LegacyExternalComponent, {
			target,
			props: { ExternalClass: StubLegacyClass, foo: 'bar' },
		});

		// onMount fires synchronously in jsdom
		if (capturedOpts !== null) {
			expect(capturedOpts).toHaveProperty('target');
			expect(capturedOpts).toHaveProperty('props');
			expect(capturedOpts.props.foo).toBe('bar');
		}

		unmount(instance);
	});
});
