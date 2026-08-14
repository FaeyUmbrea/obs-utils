import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';

// Foundry v14 Scene Levels. Requires a world whose active scene has several
// floors and at least two tokens standing on different ones — The Restored Keep
// in `scene-level-dev` is the reference setup.
//
// These cannot be unit tested: every behaviour here is a redraw crossing the
// socket between two real clients, and the whole point of the feature is that
// the OBS client ends up on a floor nobody told it about directly.

test.describe.configure({ mode: 'serial' });

async function levelName(page: Page) {
	// @ts-expect-error run in plain js
	return page.evaluate(() => window.canvas.level?.name ?? null);
}

async function setSetting(page: Page, key: string, value: unknown) {
	await page.evaluate(
		// @ts-expect-error run in plain js
		({ k, v }) => window.game.settings.set('obs-utils', k, v),
		{ k: key, v: value },
	);
}

/**
 * A floor other than the one currently shown that actually holds a token.
 *
 * It has to be occupied: the OBS client runs as a player, and core only admits
 * a non-GM to floors containing a token they can observe. Picking merely "some
 * other floor" can land on an empty one — The Restored Keep's Dungeon — which
 * the client is correctly forbidden from displaying.
 */
async function otherOccupiedLevelId(page: Page) {
	return page.evaluate(() => {
		// @ts-expect-error run in plain js
		const current = window.canvas.level?.id;
		// @ts-expect-error run in plain js
		const occupied = new Set(window.canvas.tokens.objects.children.map(t => t.document._source.level));
		return [...occupied].find(id => id !== current) ?? null;
	});
}

/**
 * Floors present, and at least two tokens on different ones.
 *
 * Scene Levels is v14-only, so `scene.levels` is absent on v13 — this reports
 * "no floors" there instead of throwing, or the guard below fails the suite
 * rather than skipping it.
 */
async function sceneIsSplit(page: Page) {
	return page.evaluate(() => {
		// @ts-expect-error run in plain js
		const levels = window.canvas.scene.levels;
		if (!levels) return { levelCount: 0, occupiedCount: 0 };
		// @ts-expect-error run in plain js
		const tokenLevels = new Set(window.canvas.tokens.objects.children.map(t => t.document._source.level).filter(Boolean));
		return { levelCount: [...levels].length, occupiedCount: tokenLevels.size };
	});
}

test.describe('Scene Levels', () => {
	// These need a v14 world whose active scene has floors with tokens on more
	// than one of them. Every other world — including v13, where Scene Levels
	// does not exist — skips rather than fails.
	test.beforeEach(async ({ pages: { gmPage } }) => {
		const { levelCount, occupiedCount } = await sceneIsSplit(gmPage);
		test.skip(
			levelCount < 2 || occupiedCount < 2,
			'active scene has no party split across floors',
		);
	});

	test('the world under test actually has a split party', async ({ pages: { gmPage } }) => {
		const { levelCount, occupiedCount } = await sceneIsSplit(gmPage);
		expect(levelCount, 'active scene needs multiple floors').toBeGreaterThan(1);
		expect(occupiedCount, 'tokens must occupy at least two floors').toBeGreaterThan(1);
	});

	test('OBS client follows the GM onto another floor under cloneDM', async ({ pages: { gmPage, obsPage } }) => {
		await setSetting(gmPage, 'pauseCameraTracking', false);
		await setSetting(gmPage, 'defaultOutOfCombat', 'cloneDM');

		const targetId = await otherOccupiedLevelId(gmPage);
		expect(targetId, 'need a second occupied floor to move to').not.toBeNull();

		await gmPage.evaluate(
			// @ts-expect-error run in plain js
			id => window.canvas.scene.view({ level: id }),
			targetId,
		);

		// Nothing tells the OBS client to move directly — it learns the floor
		// from the viewport payload the GM's redraw emits.
		await obsPage.waitForFunction(
			// @ts-expect-error run in plain js
			expected => window.canvas.level?.id === expected,
			targetId,
			{ timeout: 15000 },
		);
	});

	test('an unreachable floor holds the last frame instead of following', async ({ pages: { gmPage, obsPage } }) => {
		await setSetting(gmPage, 'pauseCameraTracking', false);
		await setSetting(gmPage, 'defaultOutOfCombat', 'cloneDM');

		// A floor with no tokens on it is one a player-account OBS client may
		// never display. Following it would mean a redraw to somewhere the
		// stream isn't allowed to be; holding the current frame is correct.
		const empty = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const occupied = new Set(window.canvas.tokens.objects.children.map(t => t.document._source.level));
			// @ts-expect-error run in plain js
			return [...window.canvas.scene.levels].find(l => !occupied.has(l.id))?.id ?? null;
		});
		test.skip(empty === null, 'scene has no empty floor to test against');

		const before = await levelName(obsPage);
		await gmPage.evaluate(
			// @ts-expect-error run in plain js
			id => window.canvas.scene.view({ level: id }),
			empty,
		);
		await gmPage.waitForTimeout(3000);
		expect(await levelName(obsPage)).toBe(before);
	});

	test('a paused camera records the floor without applying it', async ({ pages: { gmPage, obsPage } }) => {
		await setSetting(gmPage, 'defaultOutOfCombat', 'cloneDM');
		await setSetting(gmPage, 'pauseCameraTracking', true);

		const before = await levelName(obsPage);
		const other = await otherOccupiedLevelId(gmPage);
		await gmPage.evaluate(
			// @ts-expect-error run in plain js
			id => window.canvas.scene.view({ level: id }),
			other,
		);

		// Pause suppresses application, not recording: the OBS client must not
		// move, but it must still know where the GM is.
		await gmPage.waitForTimeout(2500);
		expect(await levelName(obsPage)).toBe(before);

		await setSetting(gmPage, 'pauseCameraTracking', false);
	});

	test('relative policy picks the lowest and highest occupied floor', async ({ pages: { gmPage, obsPage } }) => {
		await setSetting(gmPage, 'pauseCameraTracking', false);
		await setSetting(gmPage, 'levelPolicy', 'relative');
		await setSetting(gmPage, 'defaultOutOfCombat', 'trackall');

		// From the scene's token documents, not the token layer: the layer only
		// holds tokens on floors visible from wherever that client is currently
		// standing, so reading it would make this depend on where an earlier
		// test happened to leave the camera.
		const occupied = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const byElevation = [...window.canvas.scene.levels]
				.sort((a, b) => (a.elevation?.bottom ?? 0) - (b.elevation?.bottom ?? 0));
			// @ts-expect-error run in plain js
			const on = new Set([...window.canvas.scene.tokens].map(t => t._source.level));
			const hit = byElevation.filter(l => on.has(l.id));
			return { lowest: hit[0]?.id, highest: hit[hit.length - 1]?.id };
		});
		expect(occupied.lowest).not.toBe(occupied.highest);

		// Settings are world-scoped and leak between tests, so a `set` to the
		// value already stored fires no onChange and silently does nothing.
		// Establish the baseline explicitly and wait for it to land, which
		// guarantees the assertions below are driven by real changes.
		await gmPage.evaluate(
			// @ts-expect-error run in plain js
			id => window.canvas.scene.view({ level: id }),
			occupied.lowest,
		);
		await setSetting(gmPage, 'levelRelativeRule', 'highest');
		await setSetting(gmPage, 'levelRelativeRule', 'lowest');
		await obsPage.waitForFunction(
			// @ts-expect-error run in plain js
			id => window.canvas.level?.id === id,
			occupied.lowest,
			{ timeout: 15000 },
		);

		await setSetting(gmPage, 'levelRelativeRule', 'highest');
		await obsPage.waitForFunction(
			// @ts-expect-error run in plain js
			id => window.canvas.level?.id === id,
			occupied.highest,
			{ timeout: 15000 },
		);

		await setSetting(gmPage, 'levelRelativeRule', 'lowest');
		await obsPage.waitForFunction(
			// @ts-expect-error run in plain js
			id => window.canvas.level?.id === id,
			occupied.lowest,
			{ timeout: 15000 },
		);
	});

	test('the Director exposes the level controls on a levelled scene', async ({ pages: { gmPage } }) => {
		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		await expect(gmPage.locator('div[id=director-application]')).toBeVisible();
		const modesTab = gmPage.locator('div[id=director-application] button[role=tab]').first();
		if (await modesTab.isVisible()) await modesTab.click();

		const section = gmPage.locator('div[id=director-application] .levels-section');
		await expect(section).toBeVisible();

		// Policy select, plus the conditional control it reveals. Selecting
		// "pinned" must swap the relative-rule control for a floor picker
		// listing every floor on the scene.
		const policy = section.locator('select').first();
		await policy.selectOption('pinned');
		await expect(section.locator('select')).toHaveCount(2);
		const floors = section.locator('select').nth(1);
		const levelCount = await gmPage.evaluate(() => window.canvas.scene.levels.size);
		// +1 for the "none" entry.
		await expect(floors.locator('option')).toHaveCount(levelCount + 1);

		// The select writes through a store to a world setting asynchronously.
		// Wait for it to land, or it can overwrite the next test's policy.
		await policy.selectOption('relative');
		await gmPage.waitForFunction(
			// @ts-expect-error run in plain js
			() => window.game.settings.get('obs-utils', 'levelPolicy') === 'relative',
			null,
			{ timeout: 10000 },
		);

		await gmPage.locator('button[data-tool=openStreamDirector]').click();
	});

	test('pinning a floor moves the OBS client to it', async ({ pages: { gmPage, obsPage } }) => {
		await setSetting(gmPage, 'pauseCameraTracking', false);
		await setSetting(gmPage, 'defaultOutOfCombat', 'trackall');

		// Pin an occupied floor other than the one currently shown — an empty one
		// is legitimately refused for a player-account OBS client.
		const target = await obsPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const current = window.canvas.level?.id;
			// @ts-expect-error run in plain js
			const occupied = new Set([...window.canvas.scene.tokens].map(t => t._source.level));
			return [...occupied].find(id => id !== current) ?? null;
		});
		expect(target).not.toBeNull();

		await gmPage.evaluate(
			// @ts-expect-error run in plain js
			({ sceneId, level }) => window.game.settings.set('obs-utils', 'levelPins', { [sceneId]: { level } }),
			// @ts-expect-error run in plain js
			{ sceneId: await gmPage.evaluate(() => window.canvas.scene.id), level: target },
		);
		await setSetting(gmPage, 'levelPolicy', 'pinned');

		await obsPage.waitForFunction(
			// @ts-expect-error run in plain js
			id => window.canvas.level?.id === id,
			target,
			{ timeout: 15000 },
		);

		await setSetting(gmPage, 'levelPolicy', 'relative');
	});

	test('framing only counts tokens on the displayed floor', async ({ pages: { gmPage, obsPage } }) => {
		await setSetting(gmPage, 'levelPolicy', 'relative');
		await setSetting(gmPage, 'levelRelativeRule', 'lowest');
		await setSetting(gmPage, 'defaultOutOfCombat', 'trackall');

		await obsPage.waitForFunction(() => !!window.canvas?.level, null, { timeout: 15000 });

		// A bounding box that straddled floors would centre the camera between
		// two groups, leaving it outside the horizontal span of the floor it is
		// actually showing.
		const result = await obsPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const level = window.canvas.level?.id;
			// @ts-expect-error run in plain js
			const here = window.canvas.tokens.objects.children.filter(t => t.document._source.level === level);
			if (here.length === 0) return { skipped: true };
			const xs = here.map(t => t.document._source.x);
			// @ts-expect-error run in plain js
			const pivot = window.canvas.stage.pivot.x;
			// @ts-expect-error run in plain js
			const pad = window.canvas.scene.dimensions.size * 6;
			return { skipped: false, pivot, min: Math.min(...xs) - pad, max: Math.max(...xs) + pad };
		});

		if (!result.skipped) {
			expect(result.pivot).toBeGreaterThanOrEqual(result.min!);
			expect(result.pivot).toBeLessThanOrEqual(result.max!);
		}
	});
});
