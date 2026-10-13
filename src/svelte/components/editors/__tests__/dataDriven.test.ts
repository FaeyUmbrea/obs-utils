import { flushSync, mount, unmount } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import AVEditor from '../AVEditor.svelte';
import ImageEditor from '../ImageEditor.svelte';

vi.mock('../../../../utils/helpers', () => ({
	getActorValues: () => [{ value: 'img', label: 'Portrait' }, { value: 'name', label: 'Name' }],
	getDataPickerGroups: () => [{ label: 'Actor', items: [{ value: 'name', label: 'Name' }, { value: 'img', label: 'Portrait' }] }],
	getByOverlayDataPath: vi.fn(),
}));

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.replaceChildren();
});

it.each([
	['name', true],
	['system.attributes.hp.value', true],
	['trigger.actor.name', true],
	['Player Name', false],
])('initializes the text data-driven mode for %s', async (data, expected) => {
	vi.stubGlobal('game', { i18n: { localize: (key: string) => key } });
	const target = document.createElement('div');
	document.body.append(target);
	const component = mount(AVEditor, { target, props: { data } });
	flushSync();
	expect(target.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(expected);
	await unmount(component);
});

it.each([
	['img', true],
	['prototypeToken.texture.src', true],
	['portraits/hero.webp', false],
	['https://example.com/portrait.png', false],
])('initializes the portrait data-driven mode for %s', async (data, expected) => {
	vi.stubGlobal('game', { i18n: { localize: (key: string) => key } });
	const target = document.createElement('div');
	document.body.append(target);
	const component = mount(ImageEditor, { target, props: { data } });
	flushSync();
	expect(target.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(expected);
	await unmount(component);
});
