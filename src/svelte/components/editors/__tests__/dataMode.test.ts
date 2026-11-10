import { flushSync, mount, unmount } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import AVEditor from '../AVEditor.svelte';
import ImageEditor from '../ImageEditor.svelte';

vi.mock('../../../../utils/helpers', () => ({
	getActorValues: () => [{ value: 'img', label: 'Portrait' }, { value: 'name', label: 'Name' }],
	getDataPickerGroups: () => [{ label: 'Actor', items: [{ value: 'img', label: 'Portrait' }, { value: 'name', label: 'Name' }] }],
}));

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

it.each([
	[AVEditor, 'name', true],
	[AVEditor, 'Literal title', false],
	[ImageEditor, 'img', true],
	[ImageEditor, 'prototypeToken.texture.src', true],
	[ImageEditor, 'portraits/hero.webp', false],
	[ImageEditor, 'https://example.com/portrait.png', false],
])('recognizes configured root fields and preserves literal content (%s, %s)', async (Component, data, expected) => {
	vi.stubGlobal('game', { i18n: { localize: (key: string) => key } });
	const target = document.createElement('div');
	document.body.append(target);
	const component = mount(Component, { target, props: { data } });
	try {
		flushSync();
		expect(target.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(expected);
	} finally {
		await unmount(component);
	}
});
