import fs from 'node:fs';
import { expect, test } from '@playwright/test';

// World seeding — run deliberately, not as part of the suite.
//
//   yarn seed            (against TEST_URL, joining as Gamemaster)
//
// The E2E suite needs a world with specific actors, tokens and module settings.
// Historically that lived only inside a LevelDB world nobody could rebuild,
// which meant it could not exist at two Foundry versions at once — opening it
// with a newer binary migrates it irreversibly. This recreates it from
// `fixtures/world.json` instead, so an empty world on any version can be
// brought up to spec.
//
// Idempotent: everything is matched by name, so running it twice changes
// nothing. Ids are never stored in the fixture because they do not survive
// into a fresh world.

interface Fixture {
	users: { name: string; role: number; character: string | null }[];
	actors: {
		name: string;
		type: string;
		img?: string;
		system?: Record<string, unknown>;
		items?: { name: string; type: string }[];
		prototypeToken?: Record<string, unknown>;
		ownershipByUserName?: Record<string, number>;
	}[];
	journals: { name: string; pages: { name: string; type: string; text: string | null }[] }[];
	scene: {
		name: string;
		width: number;
		height: number;
		gridSize: number;
		tokens: { name: string; x: number; y: number; actor: string | null }[];
		flags?: Record<string, Record<string, unknown>>;
	};
	settings: Record<string, unknown>;
	settingsByActorName: Record<string, string[]>;
}

test('seed the world from fixtures/world.json', async ({ page }) => {
	// Skipped during a normal run: seeding writes to the world and should only
	// happen when asked for. `yarn seed` sets this.
	test.skip(!process.env.SEED, 'seeding only runs via `yarn seed`');
	// Creating a character's worth of system items is far slower than any
	// assertion the suite makes, so the shared 45s budget does not apply.
	test.setTimeout(5 * 60 * 1000);

	const fixture = JSON.parse(fs.readFileSync('tests/fixtures/world.json', 'utf8')) as Fixture;

	await page.goto('/join');
	await page.locator('select[name="userid"]').selectOption({ label: 'Gamemaster' });
	await page.locator('input[name=password]').fill(process.env.TEST_INSTALL_PASSWORD ?? '');
	await page.getByRole('button', { name: 'Join Game Session' }).click();
	await expect(page).toHaveURL('/game');
	await page.waitForFunction(() => (window as any).game?.ready);

	// A freshly created world has every module disabled, so none of the module's
	// settings are registered yet. Enable and reload before touching them.
	const enabled = await page.evaluate(async () => {
		const g = (window as any).game;
		const config = { ...(g.settings.get('core', 'moduleConfiguration') ?? {}) };
		const wanted = ['obs-utils', 'lib-wrapper'].filter(id => g.modules.get(id));
		const missing = wanted.filter(id => !config[id]);
		if (!missing.length) return { alreadyOn: true, wanted };
		for (const id of wanted) config[id] = true;
		await g.settings.set('core', 'moduleConfiguration', config);
		return { alreadyOn: false, wanted, missing };
	});

	if (!enabled.alreadyOn) {
		await page.goto('/game');
		await page.waitForFunction(() => (window as any).game?.ready);
		await page.waitForFunction(() => (window as any).game?.modules?.get('obs-utils')?.active === true, null, { timeout: 30000 });
	}

	const report = await page.evaluate(async (fx: Fixture) => {
		const g = (window as any).game;
		const made: string[] = [];

		// Users. Passwords stay empty — the suite logs in without one.
		for (const u of fx.users) {
			if (!g.users.getName(u.name)) {
				await g.users.documentClass.create({ name: u.name, role: u.role });
				made.push(`user:${u.name}`);
			}
		}

		// Actors before tokens, so tokens can link to them by name.
		//
		// Items are not optional decoration: the overlays read derived values like
		// max HP, and those come from the class and ancestry items rather than
		// from stored system data. An actor seeded without them has 0 max HP, and
		// the system then clamps any stored HP value to 0.
		for (const a of fx.actors) {
			const existing = g.actors.getName(a.name);
			if (!existing) {
				await g.actors.documentClass.create({
					name: a.name,
					type: a.type,
					img: a.img,
					system: a.system ?? {},
					items: a.items ?? [],
					prototypeToken: a.prototypeToken,
				});
				made.push(`actor:${a.name}`);
				continue;
			}
			// Converge rather than only create, so re-seeding repairs an actor made
			// against an earlier version of this fixture.
			const wantItems = a.items ?? [];
			const missing = wantItems.filter(i => !existing.items.getName(i.name));
			if (missing.length) {
				await existing.createEmbeddedDocuments('Item', missing);
				made.push(`actor-items:${a.name}:${missing.length}`);
			}
			if (a.system) {
				await existing.update({ system: a.system });
				made.push(`actor-system:${a.name}`);
			}
		}

		// Ownership, resolved from user names. Without it the stream client tracks
		// nothing: getAutoTokens keeps only tokens the client owns (or observes,
		// when trackObserverTokens is on), so an empty tracked set means the
		// camera never moves and every tracking assertion silently compares two
		// identical viewports.
		for (const a of fx.actors) {
			if (!a.ownershipByUserName) continue;
			const actor = g.actors.getName(a.name);
			if (!actor) continue;
			const ownership: Record<string, number> = {};
			for (const [who, level] of Object.entries(a.ownershipByUserName)) {
				if (who === 'default') {
					ownership.default = level;
					continue;
				}
				const id = g.users.getName(who)?.id;
				if (id) ownership[id] = level;
			}
			await actor.update({ ownership }, { diff: false, recursive: false });
			made.push(`ownership:${a.name}`);
		}

		for (const j of fx.journals) {
			if (g.journal.getName(j.name)) continue;
			await g.journal.documentClass.create({
				name: j.name,
				pages: j.pages.map(p => ({ name: p.name, type: p.type, text: { content: p.text ?? '' } })),
			});
			made.push(`journal:${j.name}`);
		}

		for (const u of fx.users) {
			if (!u.character) continue;
			const user = g.users.getName(u.name);
			const actor = g.actors.getName(u.character);
			if (user && actor && user.character?.id !== actor.id) {
				await user.update({ character: actor.id });
				made.push(`assign:${u.name}->${u.character}`);
			}
		}

		let scene = g.scenes.getName(fx.scene.name);
		if (!scene) {
			scene = await g.scenes.documentClass.create({
				name: fx.scene.name,
				width: fx.scene.width,
				height: fx.scene.height,
				grid: { size: fx.scene.gridSize },
			});
			made.push(`scene:${fx.scene.name}`);
		}

		for (const t of fx.scene.tokens) {
			const actor = t.actor ? g.actors.getName(t.actor) : null;
			const existing = [...scene.tokens].find((tok: any) => tok.name === t.name);
			if (!existing) {
				await scene.createEmbeddedDocuments('Token', [{
					name: t.name,
					x: t.x,
					y: t.y,
					actorId: actor?.id ?? null,
					actorLink: !!actor,
				}]);
				made.push(`token:${t.name}`);
				continue;
			}
			// Converge the link: an actor recreated by a later seed run gets a new
			// id, which would leave the token pointing at nothing.
			if (actor && existing.actorId !== actor.id) {
				await existing.update({ actorId: actor.id, actorLink: true });
				made.push(`token-relink:${t.name}`);
			}
		}

		// A run that fails partway through can leave an encounter behind, and the
		// combat helpers assume they are starting from none — they toggle tokens
		// into combat, which silently toggles them back out of a stale one.
		for (const combat of [...g.combats]) {
			await combat.delete();
			made.push('drop-stale-combat');
		}

		// Scene flags carry the stored camera presets the keyframe tests read.
		if (fx.scene.flags) {
			await scene.update({ flags: fx.scene.flags });
			made.push('scene-flags');
		}

		if (!scene.active) {
			await scene.activate();
			made.push('activate-scene');
		}

		for (const [key, value] of Object.entries(fx.settings)) {
			try {
				await g.settings.set('obs-utils', key, value);
			} catch {
				// Not registered on this build — v13 has no level settings.
			}
		}

		// Id-bearing settings are resolved from names now that actors exist.
		for (const [key, names] of Object.entries(fx.settingsByActorName)) {
			const ids = (names as string[]).map(n => g.actors.getName(n)?.id).filter(Boolean);
			try {
				await g.settings.set('obs-utils', key, ids);
			} catch {
				// Not registered on this build.
			}
		}

		let overlays = 0;
		try {
			overlays = (g.settings.get('obs-utils', 'streamOverlays') ?? []).length;
		} catch {
			// Module not active — reported as 0 so the assertion below catches it.
		}

		return {
			made,
			actors: g.actors.size,
			users: g.users.size,
			tokens: g.scenes.getName(fx.scene.name)?.tokens.size ?? 0,
			overlays,
		};
	}, fixture);

	console.warn('seeded:', JSON.stringify(report));
	expect(report.tokens).toBeGreaterThanOrEqual(fixture.scene.tokens.length);
	expect(report.overlays).toBeGreaterThan(0);
});
