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

		// OBS Remote Menu (combined connection + events; the obsWebsocket menu was folded in)

		await gmPage.locator('button[data-key=\'obs-utils.obsRemoteMenu\']').click();

		const obsRemote = gmPage.locator('div[id=\'obsremote-application\']');
		await expect(obsRemote).toBeVisible();
		await expect(obsRemote.locator('.menu-tabs button[role=tab]')).toHaveCount(2);

		await obsRemote.locator('header button[data-action=close]').click();

		// (Overlay Actor menu removed; manage actors is now in the Overlay Editor footer.)

		// Overlay Editor

		await gmPage.locator('button[data-key=\'obs-utils.overlayEditor\']').click();

		await expect(
			gmPage.locator('div[id=\'overlayeditor-application\']'),
		).toBeVisible();

		await gmPage
			.locator('div[id=\'overlayeditor-application\'] header button[data-action=close]')
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
		const journalSheet = obsPage.locator('div.app.window-app.sheet.journal-sheet, form.application.sheet.journal-sheet');
		await expect(journalSheet).toBeVisible();
		await obsPage.waitForTimeout(delay);
		await expect(journalSheet).not.toBeVisible();
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

		const limitCanvasInput = gmPage.locator('div[id=director-application] input#limitCanvas');
		const limitCanvasLabel = gmPage.locator('div[id=director-application] label[for=limitCanvas]');
		const wasClampOn = await limitCanvasInput.isChecked();
		if (wasClampOn) await limitCanvasLabel.click();

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

		if (wasClampOn) {
			await openDirector(gmPage);
			await limitCanvasLabel.click();
			await closeDirector(gmPage);
		}
	});
});

test.describe('Multi-GM Handover', () => {
	test('Take Active swaps the cloneDM mirror to the claimant', async ({ browser, pages: { gmPage, obsPage } }) => {
		// Spin up GM2 — only this test needs them, so we own the context here.
		const gm2Context = await browser.newContext();
		const gm2Page = await gm2Context.newPage();
		try {
			await gm2Page.goto('/join');
			await gm2Page.locator('select[name="userid"]').selectOption({ label: 'GM2' });
			await gm2Page.locator('input[name=password]').fill(
				process.env.TEST_INSTALL_PASSWORD ? process.env.TEST_INSTALL_PASSWORD : '',
			);
			await gm2Page.getByRole('button', { name: 'Join Game Session' }).click();
			await expect(gm2Page).toHaveURL('/game');
			// @ts-expect-error run in plain js
			await gm2Page.waitForFunction(() => window.game?.ready && window.canvas?.ready);

			const gmId = await gmPage.evaluate(() => (window as any).game.user.id);
			const gm2Id = await gm2Page.evaluate(() => (window as any).game.user.id);

			// Configure OOC mode to cloneDM + disable canvas clamp via the active GM's Director.
			// Resolve "who is active" the same way the OBS page does: explicit setting first,
			// fallback to the first online GM. Reading the setting alone is not enough — it
			// defaults to '' on a fresh world.
			const initialActiveId = await obsPage.evaluate(() => {
				const g = (window as any).game;
				const wanted = g.settings.get('obs-utils', 'activeGMUserId') as string;
				const users = g.users;
				if (wanted) {
					const u = users.get(wanted);
					if (u?.isGM && u?.active) return u.id;
				}
				return users.find((u: any) => u.isGM && u.active)?.id ?? null;
			});
			const initialActivePage = initialActiveId === gm2Id ? gm2Page : gmPage;
			const initialClaimantPage = initialActivePage === gmPage ? gm2Page : gmPage;

			await openDirector(initialActivePage);
			const limitCanvasInput = initialActivePage.locator('div[id=director-application] input#limitCanvas');
			const limitCanvasLabel = initialActivePage.locator('div[id=director-application] label[for=limitCanvas]');
			const wasClampOn = await limitCanvasInput.isChecked();
			if (wasClampOn) await limitCanvasLabel.click();
			await initialActivePage.locator('div[id=director-application] label[for=radioooccloneDM]').click();
			await closeDirector(initialActivePage);

			// Active GM pans; OBS mirrors.
			await panGMViewport(initialActivePage, 1800, 1300, 0.7);
			await expect.poll(() => getOBSViewport(obsPage)).toEqual([1800, 1300, 0.7, 0.7]);

			// Claimant opens Director, navigates to Co-DMs, clicks Take Active on their own row.
			await initialClaimantPage.locator('button[data-tool=openStreamDirector]').click();
			await expect(initialClaimantPage.locator('div#director-application')).toBeVisible();
			await initialClaimantPage.locator('div#director-application button[role=tab]').nth(2).click();
			await initialClaimantPage.locator('li.codm.me button.take-control').click();

			const claimantId = initialClaimantPage === gm2Page ? gm2Id : gmId;
			await expect.poll(() =>
				initialClaimantPage.evaluate(() => (window as any).game.settings.get('obs-utils', 'activeGMUserId')),
			).toBe(claimantId);
			// Wait for the world setting to propagate to the OBS page too — that's
			// what its viewportChanged filter consults via getActiveGM().
			await expect.poll(() =>
				obsPage.evaluate(() => (window as any).game.settings.get('obs-utils', 'activeGMUserId')),
			).toBe(claimantId);

			// The handover grant runs clampAndApplyExternal on the claimant, which
			// animates their viewport to match the previous active GM's. Wait for
			// that animation to settle before issuing the next pan, otherwise the
			// animation clobbers it.
			await expect.poll(() => initialClaimantPage.evaluate(() => [
				(window as any).canvas.stage.pivot.x,
				(window as any).canvas.stage.pivot.y,
				(window as any).canvas.stage.scale.x,
			])).toEqual([1800, 1300, 0.7]);

			// Close Director on claimant then pan — OBS mirrors them now.
			await initialClaimantPage.locator('button[data-tool=openStreamDirector]').click();
			await panGMViewport(initialClaimantPage, 2100, 1500, 0.9);
			await expect.poll(() => getOBSViewport(obsPage)).toEqual([2100, 1500, 0.9, 0.9]);

			// Old active GM pans; OBS should NOT follow them anymore.
			await panGMViewport(initialActivePage, 1500, 1100, 0.5);
			await initialActivePage.waitForTimeout(800);
			await expect(await getOBSViewport(obsPage)).toEqual([2100, 1500, 0.9, 0.9]);

			// Cleanup: hand active back, restore canvas-clamp + OOC mode.
			await initialClaimantPage.locator('button[data-tool=openStreamDirector]').click();
			await initialClaimantPage.locator('div#director-application button[role=tab]').nth(0).click();
			await closeDirector(initialClaimantPage);

			await openDirector(initialActivePage);
			await initialActivePage.locator('div[id=director-application] label[for=radiooocbirdseye]').click();
			if (wasClampOn) await limitCanvasLabel.click();
			await closeDirector(initialActivePage);
		} finally {
			await gm2Context.close();
		}
	});
});

async function getGMViewport(gmPage: Page) {
	return await gmPage.evaluate(() => [
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
	await gmPage.evaluate(async () => {
		// @ts-expect-error run in plain js
		for (const token of window.canvas.tokens.ownedTokens) {
			await token.document.toggleCombatant();
		}
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
	// The Director is tabbed; mode radios + tracked-player select live in the
	// "Modes" tab. It's the default on open, but click it explicitly so tests
	// stay robust if the default ever changes.
	const modesTab = gmPage.locator('div[id=director-application] button[role=tab]').first();
	if (await modesTab.isVisible()) await modesTab.click();
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
