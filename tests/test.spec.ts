import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

test.describe.configure({ mode: 'serial' });

test.describe('DM Client Only Tests', () => {
	test('Click Director Button to Open and Close', async ({
		pages: { gmPage },
	}) => {
		await openDirector(gmPage);

		await closeDirector(gmPage);
	});
	test('Toggle Tag Via HUD', async ({ pages: { gmPage } }) => {
		await takeControlOfToken(gmPage);
		await gmPage.evaluate(() =>
		// @ts-expect-error run in plain js
			window.game.canvas.hud.token.bind(
				// @ts-expect-error run in plain js
				window.game.canvas.tokens.controlled[0],
			),
		);

		const button = gmPage.locator('div#hud i.fa-solid.fa-signal-stream');
		const before = await gmPage.evaluate(
			() =>
			// @ts-expect-error run in plain js
				!!window.canvas.tokens.controlled[0].document.getFlag(
					'obs-utils',
					'tracked',
				),
		);
		if (!before) {
			await button.click();
			await gmPage.waitForFunction(
				() => () =>
				// @ts-expect-error run in plain js
					!!window.canvas.tokens.controlled[0].document.getFlag(
						'obs-utils',
						'tracked',
					) === true,
			);
		}
		await button.click();
		await gmPage.waitForFunction(
			() => () =>
			// @ts-expect-error run in plain js
				!!window.canvas.tokens.controlled[0].document.getFlag(
					'obs-utils',
					'tracked',
				) === false,
		);
		await button.click();
		await gmPage.waitForFunction(
			() => () =>
			// @ts-expect-error run in plain js
				!!window.canvas.tokens.controlled[0].document.getFlag(
					'obs-utils',
					'tracked',
				) === true,
		);
	});
	test('Open Settings Pages', async ({ pages: { gmPage } }) => {
		await gmPage.locator('button[data-tab=settings]').click();

		await gmPage.locator('button[data-app=\'configure\']').click();

		await gmPage.locator('button[data-tab=\'obs-utils\']').click();

		// OBS Remote Menu

		await gmPage.locator('button[data-key=\'obs-utils.obsRemoteMenu\']').click();

		await expect(
			gmPage.locator('div[id=\'obsremote-application\']'),
		).toBeVisible();

		await gmPage
			.locator('div[id=\'obsremote-application\'] header button[data-action=close]')
			.click();

		// OBS Websocket Menu

		await gmPage
			.locator('button[data-key=\'obs-utils.obsWebsocketMenu\']')
			.click();

		await expect(
			gmPage.locator('div[id=\'obswebsocket-application\']'),
		).toBeVisible();

		await gmPage
			.locator('div[id=\'obswebsocket-application\'] header button[data-action=close]')
			.click();

		// Overlay Actor Menu

		await gmPage
			.locator('button[data-key=\'obs-utils.overlayActorSelect\']')
			.click();

		await expect(
			gmPage.locator('div[id=\'actorselect-application\']'),
		).toBeVisible();

		await gmPage
			.locator('div[id=\'actorselect-application\'] header button[data-action=close]')
			.click();

		// Overlay Editor

		await gmPage.locator('button[data-key=\'obs-utils.overlayEditor\']').click();

		await expect(
			gmPage.locator('div[id=\'overlayeditor-application\']'),
		).toBeVisible();

		await gmPage
			.locator('div[id=\'overlayeditor-application\'] header button[data-action=close]')
			.click();

		// Roll Overlay Editor

		await gmPage
			.locator('button[data-key=\'obs-utils.rollOverlayEditor\']')
			.click();

		await expect(
			gmPage.locator('div[id=\'rolloverlayeditor-application\']'),
		).toBeVisible();

		await gmPage
			.locator(
				'div[id=\'rolloverlayeditor-application\'] header button[data-action=close]',
			)
			.click();
	});
});

test.describe('OBS Client Only Tests', () => {
	test('Test Elements Disappearing', async ({ pages: { obsPage } }) => {
		await expect(obsPage.locator('nav#controls')).not.toBeVisible();
		await expect(obsPage.locator('nav#navigation')).not.toBeVisible();
		await expect(obsPage.locator('div#hotbar')).not.toBeVisible();
		await expect(obsPage.locator('aside#players.app')).not.toBeVisible();
		await expect(obsPage.locator('div#sidebar.app')).not.toBeVisible();
	});
	test('Test Stream Page Background', async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');

		await obsPage.locator('div.overlay-renderer').waitFor({ state: 'visible' });

		await expect(obsPage.locator('body.stream')).toHaveCSS(
			'background-color',
			'rgba(0, 0, 0, 0)',
		);
	});
});

test.describe('Multiclient UI', () => {
	test('Journal Popout Close Delay', async ({ pages: { obsPage, gmPage } }) => {
		const delay
      // @ts-expect-error run in plain js
      = (await gmPage.evaluate(() => window.game.settings.get('obs-utils', 'popupCloseDelay'),
      )) * 1200;

		// @ts-expect-error run in plain js
		await gmPage.evaluate(() => [...window.game.journal][0].show());
		await expect(
			obsPage.locator('div.app.window-app.sheet.journal-sheet'),
		).toBeVisible();
		await obsPage.waitForTimeout(delay);
		await expect(
			obsPage.locator('div.app.window-app.sheet.journal-sheet'),
		).not.toBeVisible();
	});
	/**
	test('Image Popout Close Delay', async ({ pages: { obsPage, gmPage } }) => {
		const delay
      = (await gmPage.evaluate(() => window.game.settings.get('obs-utils', 'popupCloseDelay'),
      )) * 1200;
		await gmPage.evaluate(() =>
			window.game.journal.constructor.showImage(
				'https://www.w3.org/People/mimasa/test/imgformat/img/w3c_home.png',
			),
		);
		await expect(
			obsPage.locator('div.app.window-app.image-popout'),
		).toBeVisible();
		await obsPage.waitForTimeout(delay);
		await expect(
			obsPage.locator('div.app.window-app.image-popout'),
		).not.toBeVisible();
	});
	 */
	test('Toggle Show Combat Tracker', async ({ pages: { obsPage, gmPage } }) => {
		await gmPage.evaluate(() =>
		// @ts-expect-error run in plain js
			window.game.settings.set('obs-utils', 'showTrackerInCombat', false),
		);
		await gmPage.waitForFunction(
			() =>
			// @ts-expect-error run in plain js
				window.game.settings.get('obs-utils', 'showTrackerInCombat')
				=== false,
		);

		await startCombatWithAllTokens(gmPage);

		await expect(obsPage.locator('div#sidebar.app')).not.toBeVisible();

		await endCombat(gmPage);

		await gmPage.evaluate(() =>
		// @ts-expect-error run in plain js
			window.game.settings.set('obs-utils', 'showTrackerInCombat', true),
		);
		await gmPage.waitForFunction(
			() =>
			// @ts-expect-error run in plain js
				window.game.settings.get('obs-utils', 'showTrackerInCombat')
				=== true,
		);

		await startCombatWithAllTokens(gmPage);

		await expect(obsPage.locator('section#combat')).toBeVisible();

		await endCombat(gmPage);

		await expect(obsPage.locator('section#combat')).not.toBeVisible();
	});
});

test.describe('Multiclient Functionality Non-Combat', () => {
	test('Track All', async ({ pages: { obsPage, gmPage } }) => {
		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radioooctrackall]')
			.click();

		await closeDirector(gmPage);

		await takeControlOfToken(gmPage);

		await gmPage.keyboard.press('a', { delay: 1000 });

		const before = await getOBSViewport(obsPage);

		await gmPage.keyboard.press('d', { delay: 1000 });

		await expect(before).not.toEqual(getOBSViewport(obsPage));
	});
	test('Tag Based', async ({ pages: { obsPage, gmPage } }) => {
		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radioooctrackmanual]')
			.click();

		await closeDirector(gmPage);

		await takeControlOfToken(gmPage);

		await gmPage.keyboard.press('a', { delay: 1000 });

		const before = await getOBSViewport(obsPage);

		await gmPage.keyboard.press('d', { delay: 1000 });

		const after = await getOBSViewport(obsPage);

		await expect(before).not.toEqual(after);
	});
	test('Copy GM', async ({ pages: { obsPage, gmPage } }) => {
		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radioooccloneDM]')
			.click();

		await closeDirector(gmPage);

		await panGMViewport(gmPage, 100, 100, 0.5);

		const before = await getOBSViewport(obsPage);

		await gmPage.waitForTimeout(1000);

		await panGMViewport(gmPage, 200, 200, 1);
		const after = await getOBSViewport(obsPage);

		await expect(before).not.toEqual(after);
	});
	test('Birdseye', async ({ pages: { obsPage, gmPage } }) => {
		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radioooccloneDM]')
			.click();

		await closeDirector(gmPage);

		await panGMViewport(gmPage, 100, 100, 0.5);
		await gmPage.waitForTimeout(1000);
		const before = await getOBSViewport(obsPage);

		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radiooocbirdseye]')
			.click();

		await closeDirector(gmPage);

		const after = await getOBSViewport(obsPage);

		await expect(before).not.toEqual(after);
	});
});

test.describe('Multiclient Functionality Combat', () => {
	test('Track All', async ({ pages: { obsPage, gmPage } }) => {
		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radioictrackall]')
			.click();

		await closeDirector(gmPage);

		await startCombatWithAllTokens(gmPage);

		await takeControlOfToken(gmPage);

		await gmPage.keyboard.press('a', { delay: 1000 });

		const before = await getOBSViewport(obsPage);

		await gmPage.keyboard.press('d', { delay: 1000 });

		const after = await getOBSViewport(obsPage);

		await expect(before).not.toEqual(after);

		await endCombat(gmPage);
	});
	test('Copy GM', async ({ pages: { obsPage, gmPage } }) => {
		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radioiccloneDM]')
			.click();

		await closeDirector(gmPage);

		await startCombatWithAllTokens(gmPage);

		await panGMViewport(gmPage, 100, 100, 0.5);

		const before = await getOBSViewport(obsPage);

		await gmPage.waitForTimeout(1000);

		await panGMViewport(gmPage, 200, 200, 1);
		const after = await getOBSViewport(obsPage);

		await expect(before).not.toEqual(after);

		await endCombat(gmPage);
	});
	test('Birdseye', async ({ pages: { obsPage, gmPage } }) => {
		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radioiccloneDM]')
			.click();

		await closeDirector(gmPage);

		await startCombatWithAllTokens(gmPage);

		await panGMViewport(gmPage, 100, 100, 0.5);
		const before = await getOBSViewport(obsPage);

		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radiooocbirdseye]')
			.click();

		await closeDirector(gmPage);

		const after = await getOBSViewport(obsPage);

		await expect(before).not.toEqual(after);

		await endCombat(gmPage);
	});
});

test.describe('Player Client Additional Tests', () => {
	test('Copy Player', async ({ pages: { obsPage, gmPage, playerPage } }) => {
		await openDirector(gmPage);

		await gmPage
			.locator('div[id=director-application] label[for=radiooocclonePlayer]')
			.click();
		await gmPage
			.locator('select[name=trackedPlayer]')
			.selectOption({ label: 'Player3' });

		await closeDirector(gmPage);

		await playerPage.evaluate(() =>
		// @ts-expect-error run in plain js
			window.canvas.pan({ x: 100, y: 100, scale: 0.5 }),
		);

		await expect
			.poll(async () => {
				return await getOBSViewport(obsPage);
			})
			.toEqual([100, 100, 0.5, 0.5]);

		await playerPage.evaluate(() =>
		// @ts-expect-error run in plain js
			window.canvas.pan({ x: 200, y: 200, scale: 1 }),
		);

		await expect
			.poll(async () => {
				return await getOBSViewport(obsPage);
			})
			.toEqual([200, 200, 1, 1]);

		await panGMViewport(gmPage, 300, 300, 10);

		await expect
			.poll(async () => {
				return await getOBSViewport(obsPage);
			})
			.toEqual([200, 200, 1, 1]);
	});
});

async function startCombatWithAllTokens(gmPage: Page) {
	if (!await gmPage.locator('section#combat.active').isVisible()) {
		await gmPage.locator('button[data-tab=combat]').click();
	}

	await gmPage.evaluate(() => {
		// @ts-expect-error run in plain js
		window.canvas.tokens.ownedTokens.forEach(token =>
			token.control({ releaseOthers: false }),
		);
	});
	await gmPage.evaluate(() => {
		// @ts-expect-error run in plain js
		window.canvas.tokens.toggleCombat(true);
	});

	await gmPage.locator('button.combat-control[data-action=startCombat]').click();
}

async function endCombat(gmPage: Page) {
	if (!await gmPage.locator('section#combat.active').isVisible()) {
		await gmPage.locator('button[data-tab=combat]').click();
	}

	await gmPage
		.locator('button.combat-control[data-action=endCombat]')
		.click();

	await gmPage
		.locator('dialog button[data-action=yes]')
		.click();

	await gmPage
		.locator('dialog button[data-action=yes]')
		.waitFor({ state: 'hidden' });
}

async function openDirector(gmPage: Page) {
	await gmPage.locator('button[data-tool=openStreamDirector]').click();
	await expect(gmPage.locator('div[id=director-application]')).toBeVisible();
}

async function closeDirector(gmPage: Page) {
	await gmPage.locator('button[data-tool=openStreamDirector]').click();
	await expect(
		gmPage.locator('div[id=director-application]'),
	).not.toBeVisible();
}

async function takeControlOfToken(gmPage: Page) {
	await gmPage.evaluate(() =>
	// @ts-expect-error run in plain js
		window.game.canvas.tokens.ownedTokens[0].control(),
	);
}

async function getOBSViewport(obsPage: Page) {
	return await obsPage.evaluate(() => [
		// @ts-expect-error run in plain js
		window.canvas.stage.position.scope.pivot.x,
		// @ts-expect-error run in plain js
		window.canvas.stage.position.scope.pivot.y,
		// @ts-expect-error run in plain js
		window.canvas.stage.position.scope.scale.x,
		// @ts-expect-error run in plain js
		window.canvas.stage.position.scope.scale.y,
	]);
}

async function panGMViewport(gmPage: Page, x: number, y: number, scale: number) {
	await gmPage.evaluate(
		// @ts-expect-error run in plain js
		arg => window.canvas.pan({ x: arg.x, y: arg.y, scale: arg.scale }),
		{ x, y, scale },
	);
}
