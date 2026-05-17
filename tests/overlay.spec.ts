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

async function openSettingsTo(gmPage: Page, key: string) {
	await gmPage.locator('button[data-tab=settings]').click();
	await gmPage.locator('button[data-app=\'configure\']').click();
	await gmPage.locator('button[data-tab=\'obs-utils\']').click();
	await gmPage.locator(`button[data-key='obs-utils.${key}']`).click();
}

async function closeApp(gmPage: Page, appId: string) {
	await gmPage.locator(`div[id='${appId}'] header button[data-action=close]`).click();
	await expect(gmPage.locator(`div[id='${appId}']`)).not.toBeVisible();
}

test.describe('WYSIWYG Overlay', () => {
	test('renders component at configured absolute position', async ({ pages: { gmPage, obsPage } }) => {
		// @ts-expect-error run in plain js
		const actorID: string | null = await gmPage.evaluate(() => [...game.actors][0]?.id ?? null);

		if (!actorID) {
			test.skip();
			return;
		}

		await gmPage.evaluate((id) => {
			// @ts-expect-error run in plain js
			game.settings.set('obs-utils', 'overlayActors', [id]);
			// @ts-expect-error run in plain js
			game.settings.set('obs-utils', 'streamOverlays', [{
				type: 'wysiwyg',
				components: [{ type: 'pt', data: 'name', style: '', x: 200, y: 100, w: 300, h: 50 }],
				style: '',
				config: { w: 1920, h: 1080 },
			}]);
		}, actorID);

		await obsPage.goto('/stream');
		const wrapper = obsPage.locator('#wysiwyg-component-0-0');
		await wrapper.waitFor({ state: 'visible' });

		await expect(wrapper).toHaveCSS('left', '200px');
		await expect(wrapper).toHaveCSS('top', '100px');
		await expect(wrapper).toHaveCSS('width', '300px');
		await expect(wrapper).toHaveCSS('height', '50px');
		await expect(wrapper).toHaveCSS('position', 'absolute');
	});
});

test.describe('Overlay Editor', () => {
	test('preview actor dropdown filters to single actor', async ({ pages: { gmPage } }) => {
		// @ts-expect-error run in plain js
		const actorIDs: string[] = await gmPage.evaluate(() => game.settings.get('obs-utils', 'overlayActors') ?? []);

		if (actorIDs.length < 2) {
			test.skip();
			return;
		}

		await openSettingsTo(gmPage, 'overlayEditor');
		const editorApp = gmPage.locator('div#overlayeditor-application');
		await expect(editorApp).toBeVisible();

		const preview = editorApp.locator('.preview');

		for (const id of actorIDs) {
			await expect(preview.locator(`#actor${id}`)).toBeVisible();
		}

		const select = editorApp.locator('.preview-actor-select select');
		await select.selectOption({ value: actorIDs[0] });

		await expect(preview.locator(`#actor${actorIDs[0]}`)).toBeVisible();
		await expect(preview.locator(`#actor${actorIDs[1]}`)).not.toBeVisible();

		await closeApp(gmPage, 'overlayeditor-application');
	});

	test('roll overlay editor writes rollStay to flat setting', async ({ pages: { gmPage } }) => {
		await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			game.settings.set('obs-utils', 'rollOverlayRollStay', 5);
			// @ts-expect-error run in plain js
			game.settings.set('obs-utils', 'streamOverlays', [{
				type: 'roll',
				components: [],
				style: '',
				config: {},
			}]);
		});

		await openSettingsTo(gmPage, 'overlayEditor');
		const editorApp = gmPage.locator('div#overlayeditor-application');
		await expect(editorApp).toBeVisible();

		// rollStay is the second number input in .roll .content (fadeIn, duration, fadeOut)
		const rollStayInput = editorApp.locator('.roll .content input[type=number]').nth(1);
		await expect(rollStayInput).toHaveValue('5');

		await rollStayInput.fill('15');
		await rollStayInput.dispatchEvent('change');

		await closeApp(gmPage, 'overlayeditor-application');

		// @ts-expect-error run in plain js
		const rollStay: number = await gmPage.evaluate(() => game.settings.get('obs-utils', 'rollOverlayRollStay'));
		expect(rollStay).toBe(15);
	});
});

test.describe('Actor Select', () => {
	test('user-token quick-select section is visible when users have characters', async ({ pages: { gmPage } }) => {
		// @ts-expect-error run in plain js
		const hasUserActors: boolean = await gmPage.evaluate(() =>
			// @ts-expect-error run in plain js
			(game.users?.some((u: any) => !u.isGM && !!u.character)) ?? false
		);

		if (!hasUserActors) {
			test.skip();
			return;
		}

		// Manage Actors is now reachable only from the Overlay Editor footer.
		await openSettingsTo(gmPage, 'overlayEditor');
		const editorApp = gmPage.locator('div#overlayeditor-application');
		await expect(editorApp).toBeVisible();
		await editorApp.locator('button.footer-btn:has(.fa-users)').click();

		const actorSelectApp = gmPage.locator('div#actorselect-application');
		await expect(actorSelectApp).toBeVisible();

		await expect(actorSelectApp.locator('.user-tokens-header')).toBeVisible();
		await expect(actorSelectApp.locator('.user-token-chip').first()).toBeVisible();

		await closeApp(gmPage, 'actorselect-application');
		await closeApp(gmPage, 'overlayeditor-application');
	});
});
