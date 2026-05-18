import type { Page } from '@playwright/test';
import type { OverlayComponentData, OverlayData } from '../src/utils/types';
import { expect, test } from './fixtures.js';

test.describe.configure({ mode: 'serial' });

interface ComponentRef {
	overlayIndex: number;
	componentIndex: number;
	data: string;
	x?: number;
	y?: number;
	w?: number;
	h?: number;
}

async function findComponent(gmPage: Page, overlayType: string, componentType: string): Promise<ComponentRef | null> {
	return await gmPage.evaluate(
		(args) => {
			// @ts-expect-error run in plain js
			const setting: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const overlayIndex = setting.findIndex(o => o.type === args.overlayType);
			if (overlayIndex === -1) return null;
			const componentIndex = setting[overlayIndex].components.findIndex((c: OverlayComponentData) => c.type === args.componentType);
			if (componentIndex === -1) return null;
			const c = setting[overlayIndex].components[componentIndex];
			return {
				overlayIndex,
				componentIndex,
				data: c.data,
				x: (c as any).x,
				y: (c as any).y,
				w: (c as any).w,
				h: (c as any).h,
			};
		},
		{ overlayType, componentType },
	);
}

async function resolveActorValue(gmPage: Page, path: string) {
	return await gmPage.evaluate((p) => {
		// @ts-expect-error run in plain js
		const id = game.settings.get('obs-utils', 'overlayActors')[0];
		// @ts-expect-error run in plain js
		const actor = game.actors.get(id);
		return p.split('.').reduce((acc: any, key: string) => acc?.[key], actor);
	}, path);
}

function rendererTests(overlayType: 'sl' | 'wysiwyg', label: string) {
	test.describe(`${label} renderer`, () => {
		test.beforeEach(async ({ pages: { obsPage } }) => {
			await obsPage.goto('/stream');
		});

		test('text component shows the resolved actor value', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'pt');
			expect(ref).not.toBeNull();
			const expected = await resolveActorValue(gmPage, ref!.data);
			const element = obsPage.locator(`#overlay${ref!.overlayIndex} #component${ref!.componentIndex}`);
			await expect(element).toHaveText(expected || ref!.data);
		});

		test('fa icon renders with the configured classes', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'fai');
			expect(ref).not.toBeNull();
			const element = obsPage.locator(`#overlay${ref!.overlayIndex} #component${ref!.componentIndex} i`);
			await expect(element).toHaveClass(ref!.data);
		});

		test('boolean av icon picks the right branch', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'bav');
			expect(ref).not.toBeNull();
			const [path, truthy, falsy] = ref!.data.split(';');
			const value = await resolveActorValue(gmPage, path);
			const expected = value ? truthy : falsy;
			const element = obsPage.locator(`#overlay${ref!.overlayIndex} #component${ref!.componentIndex} i`);
			await expect(element).toHaveClass(expected);
		});

		test('boolean av image picks the right branch', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'bavimg');
			expect(ref).not.toBeNull();
			const [path, truthy, falsy] = ref!.data.split(';');
			const value = await resolveActorValue(gmPage, path);
			const expected = value ? truthy : falsy;
			const element = obsPage.locator(`#overlay${ref!.overlayIndex} #component${ref!.componentIndex} img`);
			await expect(element).toHaveAttribute('src', expected);
		});

		test('static image renders the configured src', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'img');
			expect(ref).not.toBeNull();
			const element = obsPage.locator(`#overlay${ref!.overlayIndex} #component${ref!.componentIndex} img`);
			await expect(element).toHaveAttribute('src', ref!.data);
		});

		test('multi icon av splits filled vs empty by value/max', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'micoav');
			expect(ref).not.toBeNull();
			const [valPath, filledIcon, maxPath, emptyIcon] = ref!.data.split(';');
			const value: number = await resolveActorValue(gmPage, valPath);
			const max: number = await resolveActorValue(gmPage, maxPath);
			const filledSelector = filledIcon.split(' ').join('.');
			const emptySelector = emptyIcon.split(' ').join('.');
			const root = obsPage.locator(`#overlay${ref!.overlayIndex} #component${ref!.componentIndex}`);
			await expect(root.locator(`i.${filledSelector}`)).toHaveCount(value);
			await expect(root.locator(`i.${emptySelector}`)).toHaveCount(max - value);
		});

		test('multi image av splits filled vs empty by value/max', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'mimgav');
			expect(ref).not.toBeNull();
			const [valPath, filledImg, maxPath, emptyImg] = ref!.data.split(';');
			const value: number = await resolveActorValue(gmPage, valPath);
			const max: number = await resolveActorValue(gmPage, maxPath);
			const root = obsPage.locator(`#overlay${ref!.overlayIndex} #component${ref!.componentIndex}`);
			await expect(root.locator(`img[src="${filledImg}"]`)).toHaveCount(value);
			await expect(root.locator(`img[src="${emptyImg}"]`)).toHaveCount(max - value);
		});

		test('progress bar reflects value and max', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'pb');
			expect(ref).not.toBeNull();
			const [valPath, maxPath] = ref!.data.split(';');
			const value: number = await resolveActorValue(gmPage, valPath);
			const max: number = await resolveActorValue(gmPage, maxPath);
			const element = obsPage.locator(`#overlay${ref!.overlayIndex} #component${ref!.componentIndex} progress`);
			await expect(element).toHaveAttribute('value', value.toString());
			await expect(element).toHaveAttribute('max', max.toString());
		});
	});
}

rendererTests('sl', 'Simple Overlay');
rendererTests('wysiwyg', 'WYSIWYG');

test.describe('WYSIWYG positioning', () => {
	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
	});

	test('each component wrapper is absolutely positioned at the configured x/y/w/h', async ({ pages: { gmPage, obsPage } }) => {
		const wysiwyg = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const setting: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const index = setting.findIndex(o => o.type === 'wysiwyg');
			if (index === -1) return null;
			return {
				overlayIndex: index,
				components: setting[index].components.map((c: OverlayComponentData, i: number) => ({
					i,
					x: (c as any).x,
					y: (c as any).y,
					w: (c as any).w,
					h: (c as any).h,
				})),
			};
		});

		expect(wysiwyg).not.toBeNull();

		for (const c of wysiwyg!.components) {
			const wrapper = obsPage.locator(`#wysiwyg-component-${wysiwyg!.overlayIndex}-${c.i}`);
			await expect(wrapper).toHaveCSS('position', 'absolute');
			await expect(wrapper).toHaveCSS('left', `${c.x}px`);
			await expect(wrapper).toHaveCSS('top', `${c.y}px`);
			await expect(wrapper).toHaveCSS('width', `${c.w}px`);
			await expect(wrapper).toHaveCSS('height', `${c.h}px`);
		}
	});

	test('overlay wrapper uses the configured reference resolution', async ({ pages: { gmPage, obsPage } }) => {
		const wysiwyg = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const setting: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const index = setting.findIndex(o => o.type === 'wysiwyg');
			if (index === -1) return null;
			return {
				overlayIndex: index,
				w: setting[index].config?.w,
				h: setting[index].config?.h,
			};
		});

		expect(wysiwyg).not.toBeNull();

		const root = obsPage.locator(`#overlay${wysiwyg!.overlayIndex}`);
		await expect(root).toHaveCSS('width', `${wysiwyg!.w}px`);
		await expect(root).toHaveCSS('height', `${wysiwyg!.h}px`);
	});
});

test.describe('Director (tabs)', () => {
	test('opens to the Controls tab by default with mode radios visible', async ({ pages: { gmPage } }) => {
		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		const director = gmPage.locator('div#director-application');
		await expect(director).toBeVisible();

		const tabs = director.locator('button[role=tab]');
		await expect(tabs).toHaveCount(3);
		await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

		await expect(director.locator('label[for^=radioic]').first()).toBeVisible();
		await expect(director.locator('label[for^=radioooc]').first()).toBeVisible();
		await expect(director.locator('select[name=trackedPlayer]')).toBeVisible();

		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		await expect(director).not.toBeVisible();
	});

	test('Co-DMs tab lists the other GM as offline when only this GM is online', async ({ pages: { gmPage } }) => {
		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		const director = gmPage.locator('div#director-application');
		await expect(director).toBeVisible();

		await director.locator('button[role=tab]').nth(2).click();

		await expect(director.locator('.codm-list')).toBeVisible();
		await expect(director.locator('.empty-codms')).not.toBeVisible();
		// "Me" row with the in-control badge.
		await expect(director.locator('.codm.me .badge:has(.fa-star)')).toBeVisible();
		// At least one other GM in the list, currently offline.
		await expect(director.locator('.codm.offline').first()).toBeVisible();

		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		await expect(director).not.toBeVisible();
	});
});

test.describe('Custom CSS injection', () => {
	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
	});

	test('all four obs-utils style tags are mounted on /stream', async ({ pages: { obsPage } }) => {
		const ids = ['obs-utils-css-global', 'obs-utils-css-actors', 'obs-utils-css-overlays', 'obs-utils-css-components'];
		await expect.poll(() => obsPage.evaluate(
			expected => expected.filter(id => !document.getElementById(id)).length,
			ids,
		)).toBe(0);
	});

	test('GM /game with no renderer mounted has no obs-utils style tags', async ({ pages: { gmPage } }) => {
		const ids = ['obs-utils-css-global', 'obs-utils-css-actors', 'obs-utils-css-overlays', 'obs-utils-css-components'];
		const count = await gmPage.evaluate(
			expected => expected.filter(id => !!document.getElementById(id)).length,
			ids,
		);
		expect(count).toBe(0);
	});

	test('opening the overlay editor on /game mounts the style tags, closing it removes them', async ({ pages: { gmPage } }) => {
		const ids = ['obs-utils-css-global', 'obs-utils-css-actors', 'obs-utils-css-overlays', 'obs-utils-css-components'];
		const present = () => gmPage.evaluate(
			expected => expected.filter(id => !!document.getElementById(id)).length,
			ids,
		);
		expect(await present()).toBe(0);

		await gmPage.locator('button[data-tab=settings]').click();
		await gmPage.locator('button[data-app=\'configure\']').click();
		await gmPage.locator('button[data-tab=\'obs-utils\']').click();
		await gmPage.locator('button[data-key=\'obs-utils.overlayEditor\']').click();
		await expect(gmPage.locator('div#overlayeditor-application')).toBeVisible();
		await expect.poll(present).toBe(4);

		await gmPage.locator('div#overlayeditor-application header button[data-action=close]').click();
		await expect(gmPage.locator('div#overlayeditor-application')).not.toBeVisible();
		await expect.poll(present).toBe(0);
	});

	test('layer customCSS is wrapped with the overlay-id selector and applies to the wrapper', async ({ pages: { gmPage, obsPage } }) => {
		const layer = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const o = overlays.find(o => o.type === 'sl');
			if (!o?.customCSS) return null;
			return { id: o.id, customCSS: o.customCSS };
		});
		if (!layer) {
			test.skip();
			return;
		}

		const tagContent = await obsPage.locator('style#obs-utils-css-overlays').textContent();
		expect(tagContent).toContain(`[data-overlay-id="${layer.id}"]`);

		const wrapper = obsPage.locator(`[data-overlay-id="${layer.id}"]`);
		await expect(wrapper).toHaveCSS('padding', '6px 10px');
		await expect(wrapper).toHaveCSS('border-radius', '6px');
	});

	test('component customCSS with nested selector targets inner element', async ({ pages: { gmPage, obsPage } }) => {
		const comp = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const o = overlays.find(o => o.type === 'sl');
			const c = o?.components.find((c: any) => c.type === 'fai');
			return c?.customCSS ? { id: c.id, customCSS: c.customCSS } : null;
		});
		if (!comp) {
			test.skip();
			return;
		}

		const tagContent = await obsPage.locator('style#obs-utils-css-components').textContent();
		expect(tagContent).toContain(`[data-component-id="${comp.id}"]`);

		const i = obsPage.locator(`[data-component-id="${comp.id}"] i`);
		await expect(i).toHaveCSS('color', 'rgb(255, 85, 119)');
	});

	test('progress bar nested rule applies width to the inner <progress>', async ({ pages: { gmPage, obsPage } }) => {
		const comp = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const o = overlays.find(o => o.type === 'sl');
			const c = o?.components.find((c: any) => c.type === 'pb');
			return c?.customCSS ? { id: c.id } : null;
		});
		if (!comp) {
			test.skip();
			return;
		}

		const progress = obsPage.locator(`[data-component-id="${comp.id}"] progress`);
		await expect(progress).toHaveCSS('width', '240px');
	});

	test('pseudo-element rules survive into the components style tag', async ({ pages: { obsPage } }) => {
		const tagContent = await obsPage.locator('style#obs-utils-css-components').textContent();
		expect(tagContent).toContain('::-webkit-progress-value');
	});

	test('globalOverlayCSS is auto-scoped under .overlay-renderer', async ({ pages: { gmPage, obsPage } }) => {
		const expected = await gmPage.evaluate(() => (window as any).game.settings.get('obs-utils', 'globalOverlayCSS') as string);
		if (!expected?.trim()) {
			test.skip();
			return;
		}
		const tagContent = (await obsPage.locator('style#obs-utils-css-global').textContent()) ?? '';
		// Wrapped form: `.overlay-renderer { <user-css> }` so the rules can't bleed
		// into Foundry's UI or another module's DOM.
		expect(tagContent).toContain('.overlay-renderer');
		expect(tagContent).toContain(expected.trim());
	});

	test('actorOverlayCSS is wrapped with the per-actor selector', async ({ pages: { gmPage, obsPage } }) => {
		const map = await gmPage.evaluate(() => (window as any).game.settings.get('obs-utils', 'actorOverlayCSS') as Record<string, string>);
		const entry = Object.entries(map ?? {})[0];
		if (!entry) {
			test.skip();
			return;
		}
		const [actorId] = entry;
		const tagContent = await obsPage.locator('style#obs-utils-css-actors').textContent();
		expect(tagContent).toContain(`#actor${actorId}`);
	});

	test('WYSIWYG component top-level customCSS reaches the positioning wrapper', async ({ pages: { gmPage, obsPage } }) => {
		const comp = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const o = overlays.find(o => o.type === 'wysiwyg');
			const c = o?.components.find((c: any) => c.type === 'pt');
			return c?.customCSS ? { id: c.id } : null;
		});
		if (!comp) {
			test.skip();
			return;
		}

		const wrapper = obsPage.locator(`[data-component-id="${comp.id}"]`);
		await expect(wrapper).toHaveCSS('padding', '4px 8px');
		await expect(wrapper).toHaveCSS('border-radius', '4px');
	});
});

test.describe('OBS Remote menu', () => {
	test.beforeEach(async ({ pages: { gmPage } }) => {
		await gmPage.locator('button[data-tab=settings]').click();
		await gmPage.locator('button[data-app=\'configure\']').click();
		await gmPage.locator('button[data-tab=\'obs-utils\']').click();
		await gmPage.locator('button[data-key=\'obs-utils.obsRemoteMenu\']').click();
		await expect(gmPage.locator('div#obsremote-application')).toBeVisible();
	});

	test.afterEach(async ({ pages: { gmPage } }) => {
		await gmPage.locator('div#obsremote-application header button[data-action=close]').click();
		await expect(gmPage.locator('div#obsremote-application')).not.toBeVisible();
	});

	test('Connection tab is the default and shows the three websocket fields', async ({ pages: { gmPage } }) => {
		const app = gmPage.locator('div#obsremote-application');
		const tabs = app.locator('nav.menu-tabs button[role=tab]');
		await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

		await expect(app.locator('input[name=url]')).toBeVisible();
		await expect(app.locator('input[name=port]')).toBeVisible();
		await expect(app.locator('input[name=password]')).toBeVisible();
		await expect(app.locator('select#trackedPlayer')).toBeVisible();
	});

	test('Events tab lists every registered event type and onStopStreaming is gated by the websocket setting', async ({ pages: { gmPage } }) => {
		const app = gmPage.locator('div#obsremote-application');
		await app.locator('nav.menu-tabs button[role=tab]').nth(1).click();

		const meta = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const api = game.modules.get('obs-utils').api;
			const all = Array.from(api.obsRemoteEventTypes.keys()) as string[];
			// @ts-expect-error run in plain js
			const wsOn = !!game.settings.get('obs-utils', 'enableOBSWebsocket');
			const visible = wsOn ? all : all.filter(k => k !== 'core.onStopStreaming');
			return { totalCount: all.length, visibleCount: visible.length, wsOn };
		});

		// Open the Svelecte dropdown to make options inspectable.
		await app.locator('.sv-control').click();
		const options = gmPage.locator('.sv-dropdown-content .sv-item--wrap');
		await expect(options).toHaveCount(meta.visibleCount);
		if (!meta.wsOn) {
			await expect(options.filter({ hasText: /Stop Streaming/i })).toHaveCount(0);
		}
	});

	test('Selecting a condition-bearing event renders the empty-instances state with an Add Instance button', async ({ pages: { gmPage } }) => {
		const app = gmPage.locator('div#obsremote-application');
		await app.locator('nav.menu-tabs button[role=tab]').nth(1).click();

		// Open dropdown and pick "Scene Load" — the only built-in with conditions.
		await app.locator('.sv-control').click();
		await gmPage.locator('.sv-dropdown-content .sv-item--wrap', { hasText: /Scene Load/i }).click();

		await expect(app.locator('.empty-instances, .instance').first()).toBeVisible();
		await expect(app.locator('button.add[aria-label=add]')).toBeVisible();

		// Adding an instance renders an instance card with the sceneName condition input.
		await app.locator('button.add[aria-label=add]').click();
		const instance = app.locator('.instance').first();
		await expect(instance).toBeVisible();
		await expect(instance.locator('.condition-field input[type=text]')).toBeVisible();

		// Tear it down so the test leaves no persisted custom event.
		await instance.locator('button.remove-instance').click();
		await expect(app.locator('.instance')).toHaveCount(0);
	});
});
