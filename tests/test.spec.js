import { expect, test } from './fixtures.js';

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
			window.game.canvas.hud.token.bind(
				window.game.canvas.tokens.controlled[0],
			),
		);

		const button = gmPage.locator('div#hud i[title=\'Track Token\']');
		const before = await gmPage.evaluate(
			() =>
				!!window.canvas.tokens.controlled[0].document.getFlag(
					'obs-utils',
					'tracked',
				),
		);
		if (!before) {
			button.click();
			await gmPage.waitForFunction(
				() => () =>
					!!window.canvas.tokens.controlled[0].document.getFlag(
						'obs-utils',
						'tracked',
					) === true,
			);
		}
		await button.click();
		await gmPage.waitForFunction(
			() => () =>
				!!window.canvas.tokens.controlled[0].document.getFlag(
					'obs-utils',
					'tracked',
				) === false,
		);
		await button.click();
		await gmPage.waitForFunction(
			() => () =>
				!!window.canvas.tokens.controlled[0].document.getFlag(
					'obs-utils',
					'tracked',
				) === true,
		);
	});
	test('Open Settings Pages', async ({ pages: { gmPage } }) => {
		await gmPage.locator('a.item[data-tab=settings]').click();

		await gmPage.locator('button[data-action=\'configure\']').click();

		await gmPage.locator('a[data-tab=\'obs-utils\']').click();

		// OBS Remote Menu

		await gmPage.locator('button[data-key=\'obs-utils.obsRemoteMenu\']').click();

		await expect(
			gmPage.locator('div[id=\'obsremote-application\']'),
		).toBeVisible();

		await gmPage
			.locator('div[id=\'obsremote-application\'] header a[aria-label=Close]')
			.click();

		// OBS Websocket Menu

		await gmPage
			.locator('button[data-key=\'obs-utils.obsWebsocketMenu\']')
			.click();

		await expect(
			gmPage.locator('div[id=\'obswebsocket-application\']'),
		).toBeVisible();

		await gmPage
			.locator('div[id=\'obswebsocket-application\'] header a[aria-label=Close]')
			.click();

		// Overlay Actor Menu

		await gmPage
			.locator('button[data-key=\'obs-utils.overlayActorSelect\']')
			.click();

		await expect(
			gmPage.locator('div[id=\'actorselect-application\']'),
		).toBeVisible();

		await gmPage
			.locator('div[id=\'actorselect-application\'] header a[aria-label=Close]')
			.click();

		// Overlay Editor

		await gmPage.locator('button[data-key=\'obs-utils.overlayEditor\']').click();

		await expect(
			gmPage.locator('div[id=\'overlayeditor-application\']'),
		).toBeVisible();

		await gmPage
			.locator('div[id=\'overlayeditor-application\'] header a[aria-label=Close]')
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
				'div[id=\'rolloverlayeditor-application\'] header a[aria-label=Close]',
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

		await obsPage.locator('ol#chat-log').waitFor({ state: 'visible' });

		await expect(obsPage.locator('body.stream')).toHaveCSS(
			'background-color',
			'rgba(0, 0, 0, 0)',
		);
	});
});

test.describe('Multiclient UI', () => {
	test('Journal Popout Close Delay', async ({ pages: { obsPage, gmPage } }) => {
		const delay
      = (await gmPage.evaluate(() =>
      	window.game.settings.get('obs-utils', 'popupCloseDelay'),
      )) * 1200;

		await gmPage.evaluate(() => [...window.game.journal][0].show());
		await expect(
			obsPage.locator('div.app.window-app.sheet.journal-sheet'),
		).toBeVisible();
		await obsPage.waitForTimeout(delay);
		await expect(
			obsPage.locator('div.app.window-app.sheet.journal-sheet'),
		).not.toBeVisible();
	});
	test('Image Popout Close Delay', async ({ pages: { obsPage, gmPage } }) => {
		const delay
      = (await gmPage.evaluate(() =>
      	window.game.settings.get('obs-utils', 'popupCloseDelay'),
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
	test('Toggle Show Combat Tracker', async ({ pages: { obsPage, gmPage } }) => {
		await gmPage.evaluate(() =>
			window.game.settings.set('obs-utils', 'showTrackerInCombat', false),
		);
		await gmPage.waitForFunction(
			() =>
				window.game.settings.get('obs-utils', 'showTrackerInCombat')
				=== false,
		);

		await startCombatWithAllTokens(gmPage);

		await expect(obsPage.locator('div#sidebar.app')).not.toBeVisible();

		await endCombat(gmPage);

		await gmPage.evaluate(() =>
			window.game.settings.set('obs-utils', 'showTrackerInCombat', true),
		);
		await gmPage.waitForFunction(
			() =>
				window.game.settings.get('obs-utils', 'showTrackerInCombat')
				=== true,
		);

		await startCombatWithAllTokens(gmPage);

		await expect(obsPage.locator('div#sidebar.app')).toBeVisible();

		await endCombat(gmPage);

		await expect(obsPage.locator('div#sidebar.app')).not.toBeVisible();
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
			window.canvas.pan({ x: 100, y: 100, scale: 0.5 }),
		);

		await expect
			.poll(async () => {
				return await getOBSViewport(obsPage);
			})
			.toEqual([100, 100, 0.5, 0.5]);

		await playerPage.evaluate(() =>
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

async function startCombatWithAllTokens(gmPage) {
	await gmPage.locator('a.item[data-tab=combat]').click();

	await gmPage.evaluate(() => {
		window.canvas.tokens.ownedTokens.forEach(token =>
			token.control({ releaseOthers: false }),
		);
	});
	await gmPage.evaluate(() => {
		window.canvas.tokens.toggleCombat(true);
	});

	await gmPage.locator('a.combat-control[data-control=startCombat]').click();
}

async function endCombat(gmPage) {
	await gmPage.locator('a.item[data-tab=combat]').click();

	await gmPage
		.locator('a.combat-control.center[data-control=endCombat]')
		.click();

	await gmPage
		.locator('button.dialog-button.yes.default[data-button=yes]')
		.click();

	await gmPage
		.locator('button.dialog-button.yes.default[data-button=yes]')
		.waitFor({ state: 'hidden' });
}

async function openDirector(gmPage) {
	await gmPage.locator('li[data-tool=openStreamDirector]').click();
	await expect(gmPage.locator('div[id=director-application]')).toBeVisible();
}

async function closeDirector(gmPage) {
	await gmPage.locator('li[data-tool=openStreamDirector]').click();
	await expect(
		gmPage.locator('div[id=director-application]'),
	).not.toBeVisible();
}

async function takeControlOfToken(gmPage) {
	await gmPage.evaluate(() =>
		window.game.canvas.tokens.ownedTokens[0].control(),
	);
}

async function getOBSViewport(obsPage) {
	return await obsPage.evaluate(() => [
		window.canvas.stage.position.scope.pivot.x,
		window.canvas.stage.position.scope.pivot.y,
		window.canvas.stage.position.scope.scale.x,
		window.canvas.stage.position.scope.scale.y,
	]);
}

async function panGMViewport(gmPage, x, y, scale) {
	await gmPage.evaluate(
		arg => window.canvas.pan({ x: arg.x, y: arg.y, scale: arg.scale }),
		{ x, y, scale },
	);
}
