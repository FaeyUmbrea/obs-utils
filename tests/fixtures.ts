// fixtures.js for v8 coverage
import type { Page } from '@playwright/test';
import { expect, test as testBase } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

async function setupGMPage(gmPage: Page) {
	await gmPage.goto('/join');

	await gmPage
		.locator('select[name="userid"]')
		.selectOption({ label: 'Gamemaster' });
	await gmPage
		.locator('input[name=password]')
		.fill(
			process.env.TEST_INSTALL_PASSWORD
				? process.env.TEST_INSTALL_PASSWORD
				: '',
		);

	await gmPage.getByRole('button', { name: ' Join Game Session' }).click();
	await expect(gmPage).toHaveURL('/game');
	// @ts-expect-error run in plain js
	await gmPage.waitForFunction(() => window.game.ready);
}

async function setupOBSPage(obsPage: Page) {
	await obsPage.goto('/join');

	await obsPage
		.locator('select[name="userid"]')
		.selectOption({ label: 'Player2' });
	await obsPage
		.locator('input[name=password]')
		.fill(
			process.env.TEST_INSTALL_PASSWORD
				? process.env.TEST_INSTALL_PASSWORD
				: '',
		);
	await obsPage.getByRole('button', { name: ' Join Game Session' }).click();
	await expect(obsPage).toHaveURL('/game');
	// @ts-expect-error run in plain js
	await obsPage.waitForFunction(() => window.game.ready);
}

async function setupPlayerPage(playerPage: Page) {
	await playerPage.goto('/join');
	await playerPage
		.locator('select[name="userid"]')
		.selectOption({ label: 'Player3' });
	await playerPage
		.locator('input[name=password]')
		.fill(
			process.env.TEST_INSTALL_PASSWORD
				? process.env.TEST_INSTALL_PASSWORD
				: '',
		);
	await playerPage.getByRole('button', { name: ' Join Game Session' }).click();
	await expect(playerPage).toHaveURL('/game');
	// @ts-expect-error run in plain js
	await playerPage.waitForFunction(() => window.game?.ready);
	// @ts-expect-error run in plain js
	await playerPage.waitForFunction(() => window.game.ready);
}

async function startCoverage(page: Page) {
	await Promise.all([
		page.coverage.startJSCoverage({
			resetOnNavigation: false,
		}),
		page.coverage.startCSSCoverage({
			resetOnNavigation: false,
		}),
	]);
}

const test = testBase.extend<{ pages: { gmPage: Page; obsPage: Page; playerPage: Page } }>({
	pages: [
		async ({ browser }, use) => {
			const gmContext = await browser.newContext();

			const gmPage = await gmContext.newPage();

			const obsContext = await browser.newContext();

			await obsContext.addInitScript({ path: 'tests/initScripts/fakeobs.js' });

			const obsPage = await obsContext.newPage();

			const playerContext = await browser.newContext();
			const playerPage = await playerContext.newPage();

			await Promise.all([
				setupGMPage(gmPage),
				setupOBSPage(obsPage),
				setupPlayerPage(playerPage),
			]);

			// NOTE: it depends on your project name
			const isChromium = test.info().project.name === 'Desktop Chromium';

			// console.log('autoTestFixture setup...');
			// coverage API is chromium only
			if (isChromium) {
				await Promise.all([
					startCoverage(gmPage),
					startCoverage(obsPage),
					startCoverage(playerPage),
				]);
			}

			await use({ gmPage, obsPage, playerPage });

			// console.log('autoTestFixture teardown...');
			if (isChromium) {
				await Promise.all([
					stopCoverage(gmPage),
					stopCoverage(obsPage),
					stopCoverage(playerPage),
				]);
			}

			await playerContext.close();
			await gmContext.close();
			await obsContext.close();
		},
		{
			scope: 'test',
			auto: true,
		},
	],
});
export { expect, test };

async function stopCoverage(page: Page) {
	const [jsCoverage, cssCoverage] = await Promise.all([
		page.coverage.stopJSCoverage(),
		page.coverage.stopCSSCoverage(),
	]);
	const coverageList = [...jsCoverage, ...cssCoverage];
	// console.log(coverageList.map((item) => item.url));
	await addCoverageReport(coverageList, test.info());
}
