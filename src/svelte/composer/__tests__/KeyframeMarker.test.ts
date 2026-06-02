import { mount, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import KeyframeMarker from '../KeyframeMarker.svelte';

function makeTarget() {
	document.body.innerHTML = '<div id="target"></div>';
	return document.getElementById('target')!;
}

const baseProps = {
	leftPx: 0,
	selected: false,
	multiSelected: false,
	ariaLabel: 'test marker',
	onMousedown: vi.fn(),
	onClick: vi.fn(),
	onKeydown: vi.fn(),
};

describe('keyframeMarker.svelte', () => {
	it('variant=legacy renders kf-legacy and kf-marker classes', () => {
		const target = makeTarget();
		const instance = mount(KeyframeMarker, {
			target,
			props: { ...baseProps, variant: 'legacy' },
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		expect(el?.className).toContain('kf-marker');
		expect(el?.className).toContain('kf-legacy');

		unmount(instance);
	});

	it('variant=aggregate renders kf-aggregate class', () => {
		const target = makeTarget();
		const instance = mount(KeyframeMarker, {
			target,
			props: { ...baseProps, variant: 'aggregate' },
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		expect(el?.className).toContain('kf-aggregate');

		unmount(instance);
	});

	it('variant=prop with easing.equation=back renders kf-eq-back', () => {
		const target = makeTarget();
		const instance = mount(KeyframeMarker, {
			target,
			props: {
				...baseProps,
				variant: 'prop',
				easing: { interpolation: 'bezier', equation: 'back' },
			},
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		expect(el?.className).toContain('kf-eq-back');

		unmount(instance);
	});

	it('leftPx=42 sets inline style left: 42px', () => {
		const target = makeTarget();
		const instance = mount(KeyframeMarker, {
			target,
			props: { ...baseProps, variant: 'legacy', leftPx: 42 },
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		expect(el?.getAttribute('style')).toBe('left: 42px;');

		unmount(instance);
	});

	it('selected=true adds selected class', () => {
		const target = makeTarget();
		const instance = mount(KeyframeMarker, {
			target,
			props: { ...baseProps, variant: 'legacy', selected: true },
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		expect(el?.className).toContain('selected');

		unmount(instance);
	});

	it('multiSelected=true adds multi-selected class', () => {
		const target = makeTarget();
		const instance = mount(KeyframeMarker, {
			target,
			props: { ...baseProps, variant: 'legacy', multiSelected: true },
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		expect(el?.className).toContain('multi-selected');

		unmount(instance);
	});

	it('dataKfRef sets data-kf-ref attribute', () => {
		const target = makeTarget();
		const instance = mount(KeyframeMarker, {
			target,
			props: { ...baseProps, variant: 'legacy', dataKfRef: 'legacy:c1:3' },
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		expect(el?.getAttribute('data-kf-ref')).toBe('legacy:c1:3');

		unmount(instance);
	});

	it('click fires onClick callback with MouseEvent', () => {
		const target = makeTarget();
		const onClick = vi.fn();
		const instance = mount(KeyframeMarker, {
			target,
			props: { ...baseProps, variant: 'legacy', onClick },
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		el.click();

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onClick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);

		unmount(instance);
	});

	it('mousedown fires onMousedown callback', () => {
		const target = makeTarget();
		const onMousedown = vi.fn();
		const instance = mount(KeyframeMarker, {
			target,
			props: { ...baseProps, variant: 'legacy', onMousedown },
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

		expect(onMousedown).toHaveBeenCalledTimes(1);

		unmount(instance);
	});

	it('keydown fires onKeydown callback', () => {
		const target = makeTarget();
		const onKeydown = vi.fn();
		const instance = mount(KeyframeMarker, {
			target,
			props: { ...baseProps, variant: 'legacy', onKeydown },
		});

		const el = target.querySelector('[role="button"]') as HTMLElement;
		el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(onKeydown).toHaveBeenCalledTimes(1);

		unmount(instance);
	});
});
