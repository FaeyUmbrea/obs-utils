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

	test('Co-DMs tab shows the single-GM empty-state explainer', async ({ pages: { gmPage } }) => {
		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		const director = gmPage.locator('div#director-application');
		await expect(director).toBeVisible();

		await director.locator('button[role=tab]').nth(2).click();

		await expect(director.locator('.empty-codms')).toBeVisible();
		await expect(director.locator('.codm-list')).not.toBeVisible();

		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		await expect(director).not.toBeVisible();
	});
});
