import type { Page } from '@playwright/test';
import type { OverlayData } from '../src/utils/types';
import { expect, test } from './fixtures.js';

test.describe.configure({ mode: 'serial' });

test.describe('Overlay Tests', () => {
	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
	});
	test('Text', async ({ pages: { gmPage, obsPage } }) => {
		const overlay = await getOverlay(gmPage, 'pt');

		expect(overlay.index).not.toBe(-1);

		const element = obsPage.locator(`#component${overlay.index}`);
		// @ts-expect-error evaluated on page in plain JS
		const name = await gmPage.evaluate(text => text.split('.').reduce((acc, key) => acc[key], game.actors.find(_ => game.settings.get('obs-utils', 'overlayActors'))), overlay.data);

		await expect(element).toHaveText(name || overlay.data);
	});
	test('FA Icon Component', async ({ pages: { obsPage, gmPage } }) => {
		const overlay = await getOverlay(gmPage, 'fai');

		expect(overlay.index).not.toBe(-1);

		const element = obsPage.locator(`#component${overlay.index} i`);
		await expect(element).toHaveClass(overlay.data ?? '');
	});
	test('Boolean AV Icon', async ({ pages: { obsPage, gmPage } }) => {
		const overlay = await getOverlay(gmPage, 'bav');

		expect(overlay.index).not.toBe(-1);

		const element = obsPage.locator(`#component${overlay.index} i`);

		await expect(element).toHaveClass(overlay.data?.split(';')[1] ?? '');
	});
	test('Boolean AV Image', async ({ pages: { obsPage, gmPage } }) => {
		const overlay = await getOverlay(gmPage, 'bavimg');

		expect(overlay.index).not.toBe(-1);

		const element = obsPage.locator(`#component${overlay.index} img`);

		await expect(element).toHaveAttribute('src', overlay.data?.split(';')[2] ?? '');
	});

	test('Image', async ({ pages: { obsPage, gmPage } }) => {
		const overlay = await getOverlay(gmPage, 'img');

		expect(overlay.index).not.toBe(-1);

		const element = obsPage.locator(`#component${overlay.index} img`);

		await expect(element).toHaveAttribute('src', overlay.data ?? '');
	});

	test('Multi Icon AV', async ({ pages: { obsPage, gmPage } }) => {
		const overlay = await getOverlay(gmPage, 'micoav');

		expect(overlay.index).not.toBe(-1);

		const element = obsPage.locator(`#component${overlay.index}`);

		// @ts-expect-error run in plain js
		const val1 = await gmPage.evaluate(text => text.split('.').reduce((acc, key) => acc[key], game.actors.find(_ => game.settings.get('obs-utils', 'overlayActors'))), overlay.data.split(';')[0]);
		// @ts-expect-error run in plain js
		const val2 = await gmPage.evaluate(text => text.split('.').reduce((acc, key) => acc[key], game.actors.find(_ => game.settings.get('obs-utils', 'overlayActors'))), overlay.data.split(';')[2]);

		const selector1 = overlay.data?.split(';')[1]?.split(' ').join('.');
		const selector2 = overlay.data?.split(';')[3]?.split(' ').join('.');

		await expect(element.locator(`i.${selector1}`)).toHaveCount(val1);
		await expect(element.locator(`i.${selector2}`)).toHaveCount(val2 - val1);
	});

	test('Multi Image AV', async ({ pages: { obsPage, gmPage } }) => {
		const overlay = await getOverlay(gmPage, 'mimgav');

		expect(overlay.index).not.toBe(-1);

		const element = obsPage.locator(`#component${overlay.index}`);

		// @ts-expect-error run in plain js
		const val1 = await gmPage.evaluate(text => text.split('.').reduce((acc, key) => acc[key], game.actors.find(_ => game.settings.get('obs-utils', 'overlayActors'))), overlay.data.split(';')[0]);
		// @ts-expect-error run in plain js
		const val2 = await gmPage.evaluate(text => text.split('.').reduce((acc, key) => acc[key], game.actors.find(_ => game.settings.get('obs-utils', 'overlayActors'))), overlay.data.split(';')[2]);

		const selector1 = overlay.data?.split(';')[1]?.split(' ').join('.');
		const selector2 = overlay.data?.split(';')[3]?.split(' ').join('.');

		await expect(element.locator(`img[src="${selector1}"]`)).toHaveCount(val1);
		await expect(element.locator(`img[src="${selector2}"]`)).toHaveCount(val2 - val1);
	});

	test('Progress Bar', async ({ pages: { obsPage, gmPage } }) => {
		const overlay = await getOverlay(gmPage, 'pb');

		expect(overlay.index).not.toBe(-1);

		const element = obsPage.locator(`#component${overlay.index} progress`);

		// @ts-expect-error run in plain js
		const val1 = await gmPage.evaluate(text => text.split('.').reduce((acc, key) => acc[key], game.actors.find(_ => game.settings.get('obs-utils', 'overlayActors'))), overlay.data.split(';')[0]);
		// @ts-expect-error run in plain js
		const val2 = await gmPage.evaluate(text => text.split('.').reduce((acc, key) => acc[key], game.actors.find(_ => game.settings.get('obs-utils', 'overlayActors'))), overlay.data.split(';')[1]);

		await expect(element).toHaveAttribute('value', val1.toString());
		await expect(element).toHaveAttribute('max', val2.toString());
	});
});

async function getOverlay(gmPage: Page, type: string) {
	// @ts-expect-error run in plain js
	const setting: OverlayData[] = await gmPage.evaluate(() => game.settings.get('obs-utils', 'streamOverlays'));
	const slo = setting.find(e => e.type = 'sl');
	const index = slo?.components.findIndex(e => e.type === type);
	if (index === undefined) {
		return { data: null, index: -1 };
	}
	return { data: index !== -1 ? slo?.components[index]?.data : null, index };
}
