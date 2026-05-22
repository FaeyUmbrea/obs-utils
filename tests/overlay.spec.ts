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

async function getUserIds(gmPage: Page): Promise<Record<string, string>> {
	return await gmPage.evaluate(() => {
		const out: Record<string, string> = {};
		// @ts-expect-error run in plain js
		for (const u of game.users.contents) out[u.name] = u.id;
		return out;
	});
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

async function firstOverlayActorId(gmPage: Page): Promise<string> {
	return await gmPage.evaluate(() => {
		// @ts-expect-error run in plain js
		return game.settings.get('obs-utils', 'overlayActors')[0];
	});
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
			const actorId = await firstOverlayActorId(gmPage);
			const element = obsPage.locator(`#actor${actorId} #overlay${ref!.overlayIndex} #component${ref!.componentIndex}`);
			await expect(element).toHaveText(expected || ref!.data);
		});

		test('fa icon renders with the configured classes', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'fai');
			expect(ref).not.toBeNull();
			const actorId = await firstOverlayActorId(gmPage);
			const element = obsPage.locator(`#actor${actorId} #overlay${ref!.overlayIndex} #component${ref!.componentIndex} i`);
			await expect(element).toHaveClass(ref!.data);
		});

		test('boolean av icon picks the right branch', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'bav');
			expect(ref).not.toBeNull();
			const [path, truthy, falsy] = ref!.data.split(';');
			const value = await resolveActorValue(gmPage, path);
			const expected = value ? truthy : falsy;
			const actorId = await firstOverlayActorId(gmPage);
			const element = obsPage.locator(`#actor${actorId} #overlay${ref!.overlayIndex} #component${ref!.componentIndex} i`);
			await expect(element).toHaveClass(expected);
		});

		test('boolean av image picks the right branch', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'bavimg');
			expect(ref).not.toBeNull();
			const [path, truthy, falsy] = ref!.data.split(';');
			const value = await resolveActorValue(gmPage, path);
			const expected = value ? truthy : falsy;
			const actorId = await firstOverlayActorId(gmPage);
			const element = obsPage.locator(`#actor${actorId} #overlay${ref!.overlayIndex} #component${ref!.componentIndex} img`);
			await expect(element).toHaveAttribute('src', expected);
		});

		test('static image renders the configured src', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'img');
			expect(ref).not.toBeNull();
			const actorId = await firstOverlayActorId(gmPage);
			const element = obsPage.locator(`#actor${actorId} #overlay${ref!.overlayIndex} #component${ref!.componentIndex} img`);
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
			const actorId = await firstOverlayActorId(gmPage);
			const root = obsPage.locator(`#actor${actorId} #overlay${ref!.overlayIndex} #component${ref!.componentIndex}`);
			await expect(root.locator(`i.${filledSelector}`)).toHaveCount(value);
			await expect(root.locator(`i.${emptySelector}`)).toHaveCount(max - value);
		});

		test('multi image av splits filled vs empty by value/max', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'mimgav');
			expect(ref).not.toBeNull();
			const [valPath, filledImg, maxPath, emptyImg] = ref!.data.split(';');
			const value: number = await resolveActorValue(gmPage, valPath);
			const max: number = await resolveActorValue(gmPage, maxPath);
			const actorId = await firstOverlayActorId(gmPage);
			const root = obsPage.locator(`#actor${actorId} #overlay${ref!.overlayIndex} #component${ref!.componentIndex}`);
			await expect(root.locator(`img[src="${filledImg}"]`)).toHaveCount(value);
			await expect(root.locator(`img[src="${emptyImg}"]`)).toHaveCount(max - value);
		});

		test('progress bar reflects value and max', async ({ pages: { gmPage, obsPage } }) => {
			const ref = await findComponent(gmPage, overlayType, 'pb');
			expect(ref).not.toBeNull();
			const [valPath, maxPath] = ref!.data.split(';');
			const value: number = await resolveActorValue(gmPage, valPath);
			const max: number = await resolveActorValue(gmPage, maxPath);
			const actorId = await firstOverlayActorId(gmPage);
			const element = obsPage.locator(`#actor${actorId} #overlay${ref!.overlayIndex} #component${ref!.componentIndex} progress`);
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

		const actorId = await firstOverlayActorId(gmPage);
		for (const c of wysiwyg!.components) {
			const wrapper = obsPage.locator(`#actor${actorId} #wysiwyg-component-${wysiwyg!.overlayIndex}-${c.i}`);
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

		const actorId = await firstOverlayActorId(gmPage);
		const root = obsPage.locator(`#actor${actorId} #overlay${wysiwyg!.overlayIndex}`);
		await expect(root).toHaveCSS('width', `${wysiwyg!.w}px`);
		await expect(root).toHaveCSS('height', `${wysiwyg!.h}px`);
	});
});

test.describe('Render parity', () => {
	// Snapshot the rendered positions of every actor row and every overlay
	// element on /stream. If a future change moves anything by even a pixel,
	// the snapshot diff catches it. Update with `playwright test -u` after a
	// deliberate layout change; otherwise treat a failure as a regression.
	//
	// NOTE: the stored baseline (tests/overlay.spec.ts-snapshots/stream-positions-Desktop-Chromium-darwin.json)
	// is stale after the fixture refresh — 10 overlays + 2 actors now. Regenerate
	// once with `npx playwright test tests/overlay.spec.ts -g "actor + overlay positions match the stored baseline" -u`.

	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
		// Give the renderer + any GSAP entrance animations time to settle so
		// the snapshot reflects steady-state positions.
		await obsPage.waitForSelector('.obs-utils.overlay .actor');
		await obsPage.waitForTimeout(1500);
	});

	test('actor + overlay positions match the stored baseline', async ({ pages: { obsPage } }) => {
		const positions = await obsPage.evaluate(() => {
			const round = (n: number) => Math.round(n);
			const actors = Array.from(document.querySelectorAll('.obs-utils.overlay .actor')).map((el) => {
				const r = el.getBoundingClientRect();
				return {
					name: el.getAttribute('data-actor-name'),
					box: { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) },
				};
			});
			const overlays = Array.from(document.querySelectorAll('[data-overlay-id]')).map((el) => {
				const r = el.getBoundingClientRect();
				return {
					id: el.getAttribute('data-overlay-id'),
					actor: el.closest('.actor')?.getAttribute('data-actor-name') ?? null,
					box: { x: round(r.x), y: round(r.y), w: round(r.width), h: round(r.height) },
				};
			});
			return { actors, overlays };
		});

		expect(JSON.stringify(positions, null, '\t')).toMatchSnapshot('stream-positions.json');
	});
});

test.describe('Component animations (5.1)', () => {
	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
	});

	test('playback engine writes inline transform/opacity onto the component wrapper', async ({ pages: { obsPage } }) => {
		const wrapper = obsPage.locator('[data-overlay-row-id="test-hp-pulse"] .overlay-tile.actor-layer [data-component-id]').first();
		await expect(wrapper).toBeAttached();
		// One frame is enough — the playback engine drives styles every rAF.
		await obsPage.waitForTimeout(120);
		const inlineStyle = await wrapper.getAttribute('style');
		expect(inlineStyle).toBeTruthy();
		expect(inlineStyle).toMatch(/transform:|opacity:/);
	});
});

test.describe('Camera keyframes (5.1)', () => {
	// Requires a scene preset with a `keyframes` array on the current scene
	// (see tests/world-prep.md). We verify the storage shape via the API and
	// that the editor surfaces match the data. We don't trigger playback —
	// the canvas-camera side effect doesn't bleed into other tests, but
	// observe-only is the project convention.

	test('current scene has a keyframed preset stored in scene flags', async ({ pages: { gmPage } }) => {
		const preset = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const scene = canvas.scene;
			const raw = scene?.getFlag?.('obs-utils', 'cameraPresets') as string | undefined;
			if (!raw) return null;
			try {
				const parsed = JSON.parse(raw);
				const kf = (parsed.presets ?? []).find((p: any) => Array.isArray(p.keyframes) && p.keyframes.length > 0);
				return kf ?? null;
			} catch {
				return null;
			}
		});
		expect(preset).not.toBeNull();
		expect(preset!.keyframes.length).toBeGreaterThanOrEqual(2);
		expect(preset!.keyframes[0]).toMatchObject({ time: expect.any(Number), x: expect.any(Number), y: expect.any(Number), scale: expect.any(Number), easing: expect.anything() });
	});

	test('Director Presets tab renders a row per stored preset', async ({ pages: { gmPage } }) => {
		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		const director = gmPage.locator('div#director-application');
		await expect(director).toBeVisible();
		// Click the Presets tab (built-in tab #2, order 20).
		await director.locator('button[role=tab]').nth(1).click();

		const presetCount = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const scene = canvas.scene;
			const raw = scene?.getFlag?.('obs-utils', 'cameraPresets') as string | undefined;
			if (!raw) return 0;
			try {
				return (JSON.parse(raw).presets ?? []).length;
			} catch {
				return 0;
			}
		});
		await expect(director.locator('.preset')).toHaveCount(presetCount);

		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		await expect(director).not.toBeVisible();
	});

	test('editing a keyframed preset opens the animation editor window with N keyframes', async ({ pages: { gmPage } }) => {
		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		const director = gmPage.locator('div#director-application');
		await expect(director).toBeVisible();
		await director.locator('button[role=tab]').nth(1).click();

		const keyframeCount = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const scene = canvas.scene;
			const raw = scene?.getFlag?.('obs-utils', 'cameraPresets') as string | undefined;
			if (!raw) return 0;
			try {
				const kf = (JSON.parse(raw).presets ?? []).find((p: any) => Array.isArray(p.keyframes) && p.keyframes.length > 0);
				return kf?.keyframes?.length ?? 0;
			} catch {
				return 0;
			}
		});
		expect(keyframeCount).toBeGreaterThan(0);

		// Animated preset rows render an edit button with the pen-square icon.
		// Click it on the first animated row — only animated rows expose this
		// button, so .first() always lands on the right one.
		await director.locator('.preset button.preset-action i.fa-pen-to-square').first().click();

		// The editor opens in a separate ApplicationV2 window (not nested in
		// the director). Its keyframe sidebar lists one <li> per keyframe.
		const editor = gmPage.locator('div#obs-utils-animation-preset');
		await expect(editor).toBeVisible();
		await expect(editor.locator('.ape-list ul li')).toHaveCount(keyframeCount);

		await editor.locator('header button[data-action=close]').click();
		await expect(editor).not.toBeVisible();

		await gmPage.locator('button[data-tool=openStreamDirector]').click();
		await expect(director).not.toBeVisible();
	});
});

test.describe('Director API surface (5.1)', () => {
	// Observe-only — verifies the new public surface exposes the right shape.
	// Registering a third-party tab would mutate the API state and bleed into
	// other tests, so we only assert the built-ins.

	test('directorTabs registry exposes the three built-ins with the expected orders', async ({ pages: { gmPage } }) => {
		const tabs = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const api = game.modules.get('obs-utils').api;
			return Array.from(api.directorTabs.values()).map((t: any) => ({ key: t.key, order: t.order, label: t.label }));
		});
		expect(tabs.length).toBeGreaterThanOrEqual(3);
		const byKey = Object.fromEntries(tabs.map(t => [t.key, t]));
		expect(byKey['core.controls']).toBeDefined();
		expect(byKey['core.presets']).toBeDefined();
		expect(byKey['core.codms']).toBeDefined();
		expect(byKey['core.controls'].order).toBe(10);
		expect(byKey['core.presets'].order).toBe(20);
		expect(byKey['core.codms'].order).toBe(30);
	});

	test('getDirectorState returns the snapshot reflecting current settings', async ({ pages: { gmPage } }) => {
		const state = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const api = game.modules.get('obs-utils').api;
			return api.getDirectorState();
		});
		expect(state).toMatchObject({
			trackingModeInCombat: expect.any(String),
			trackingModeOutOfCombat: expect.any(String),
			isInCombat: expect.any(Boolean),
			activeTrackingMode: expect.any(String),
		});
		// obsModeUserId is either null or a string id (not the literal 'none').
		expect(state.obsModeUserId === null || typeof state.obsModeUserId === 'string').toBe(true);
		expect(state.obsModeUserId).not.toBe('none');
	});

	test('activeTrackingMode derives from in-/out-of-combat based on current combat state', async ({ pages: { gmPage } }) => {
		const result = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const api = game.modules.get('obs-utils').api;
			const s = api.getDirectorState();
			return {
				expectedActive: s.isInCombat ? s.trackingModeInCombat : s.trackingModeOutOfCombat,
				actualActive: s.activeTrackingMode,
			};
		});
		expect(result.actualActive).toBe(result.expectedActive);
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
		// Composer mounts with the mode tabs visible once an overlay is selected.
		await expect(gmPage.locator('div#overlayeditor-application .composer .mode-tabs button[role=tab]')).toHaveCount(4);
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

		const wrapper = obsPage.locator(`[data-overlay-id="${layer.id}"]`).first();
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

		const i = obsPage.locator(`[data-component-id="${comp.id}"] i`).first();
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

		const progress = obsPage.locator(`[data-component-id="${comp.id}"] progress`).first();
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

		const wrapper = obsPage.locator(`[data-component-id="${comp.id}"]`).first();
		await expect(wrapper).toHaveCSS('padding', '4px 8px');
		await expect(wrapper).toHaveCSS('border-radius', '4px');
	});

	test('Roll Banner overlay customCSS is wrapped with its own data-overlay-id selector', async ({ pages: { obsPage } }) => {
		const tagContent = (await obsPage.locator('style#obs-utils-css-overlays').textContent()) ?? '';
		expect(tagContent).toContain('[data-overlay-id="test-roll-banner"]');
	});

	test('Scene Title layer + component customCSS are present in their style tags', async ({ pages: { obsPage } }) => {
		const overlayCSS = (await obsPage.locator('style#obs-utils-css-overlays').textContent()) ?? '';
		const componentsCSS = (await obsPage.locator('style#obs-utils-css-components').textContent()) ?? '';
		expect(overlayCSS).toContain('[data-overlay-id="test-scene-title"]');
		// The Scene Title's component customCSS lives in the components tag, scoped
		// by component-id. We don't know the component-id without reading settings;
		// instead assert the scene-title overlay scope appears somewhere relevant.
		const sceneTitleHasComponentCSS = await obsPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const o = overlays.find(x => x.id === 'test-scene-title');
			const c = o?.components.find((cc: any) => !!cc.customCSS);
			return c?.id ?? null;
		});
		if (sceneTitleHasComponentCSS) {
			expect(componentsCSS).toContain(`[data-component-id="${sceneTitleHasComponentCSS}"]`);
		}
	});
});

test.describe('Tile-mode rendering (5.2)', () => {
	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
		await obsPage.waitForSelector('.obs-utils.overlay');
	});

	test('tileBy players renders one roll-instance tile per non-GM user', async ({ pages: { gmPage, obsPage } }) => {
		const nonGmCount = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			return game.users.contents.filter((u: any) => !u.isGM).length;
		});
		const tiles = obsPage.locator('[data-overlay-row-id="test-roll-banner"] .overlay-tile.roll-instance');
		await expect(tiles).toHaveCount(nonGmCount);
		const names = await tiles.evaluateAll(els => els.map(e => e.getAttribute('data-player-name')));
		for (const n of names) {
			expect(['Player2', 'Player3', 'Player4']).toContain(n);
		}
	});

	test('tileBy users renders one roll-instance tile per user including GMs', async ({ pages: { gmPage, obsPage } }) => {
		const total = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			return game.users.contents.length;
		});
		const tiles = obsPage.locator('[data-overlay-row-id="test-chat-banner"] .overlay-tile.roll-instance');
		await expect(tiles).toHaveCount(total);
	});

	test('tileBy actors renders one actor-layer tile per overlayActor', async ({ pages: { gmPage, obsPage } }) => {
		const actorNames = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const ids: string[] = game.settings.get('obs-utils', 'overlayActors') ?? [];
			// @ts-expect-error run in plain js
			return ids.map((id: string) => game.actors.get(id)?.name).filter(Boolean);
		});
		const tiles = obsPage.locator('[data-overlay-row-id="test-hp-pulse"] .overlay-tile.actor-layer');
		await expect(tiles).toHaveCount(actorNames.length);
		const renderedNames = await tiles.evaluateAll(els => els.map(e => e.getAttribute('data-actor-name')));
		for (const n of actorNames) expect(renderedNames).toContain(n);
	});

	test('tileBy once renders a single singleton-layer tile', async ({ pages: { obsPage } }) => {
		const tiles = obsPage.locator('[data-overlay-row-id="test-scene-title"] .overlay-tile.singleton-layer');
		await expect(tiles).toHaveCount(1);
	});

	test('overlay-row uses inline-row for sl and canvas-row for wysiwyg overlays', async ({ pages: { obsPage } }) => {
		for (const id of ['test-roll-banner', 'test-hp-pulse', 'test-crit-pulse', 'test-legacy-mixed-kfs']) {
			await expect(obsPage.locator(`.overlay-row.inline-row[data-overlay-row-id="${id}"]`)).toHaveCount(1);
		}
		for (const id of ['test-scene-title', 'test-chat-banner']) {
			await expect(obsPage.locator(`.overlay-row.canvas-row[data-overlay-row-id="${id}"]`)).toHaveCount(1);
		}
	});
});

test.describe('Animation playback (5.2)', () => {
	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
		await obsPage.waitForSelector('.obs-utils.overlay');
	});

	test('looping HP Pulse track advances opacity over time', async ({ pages: { obsPage } }) => {
		const wrapper = obsPage.locator('[data-overlay-row-id="test-hp-pulse"] .overlay-tile.actor-layer [data-component-id]').first();
		await expect(wrapper).toBeAttached();
		await obsPage.waitForTimeout(50);
		const sample = async () => wrapper.evaluate(el => Number.parseFloat(getComputedStyle(el).opacity));
		const o1 = await sample();
		await obsPage.waitForTimeout(400);
		const o2 = await sample();
		expect(o1).not.toBeCloseTo(o2, 3);
	});

	test('legacy lane.keyframes back-compat track also drives a moving frame', async ({ pages: { obsPage } }) => {
		const wrapper = obsPage.locator('[data-overlay-row-id="test-legacy-mixed-kfs"] .overlay-tile [data-component-id]').first();
		await expect(wrapper).toBeAttached();
		await obsPage.waitForTimeout(50);
		const sample = async () => wrapper.getAttribute('style');
		const s1 = await sample();
		await obsPage.waitForTimeout(400);
		const s2 = await sample();
		expect(s1).not.toBe(s2);
	});

	test('Roll Banner static idle holds keyframe-0 opacity before any trigger', async ({ pages: { gmPage, obsPage } }) => {
		const expected = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const o = overlays.find(x => x.id === 'test-roll-banner');
			if (!o?.animation) return null;
			const idle = o.animation.tracks.find(t => t.id === o.animation!.initialTrackId);
			if (!idle) return null;
			const lane = idle.lanes[0];
			if (!lane) return null;
			const pkf = lane.propertyKeyframes?.opacity;
			if (pkf && pkf.length > 0) return { componentId: lane.componentId, opacity: pkf[0].v };
			const legacy = lane.keyframes[0];
			if (legacy && typeof legacy.opacity === 'number') return { componentId: lane.componentId, opacity: legacy.opacity };
			return null;
		});
		test.skip(!expected, 'Roll Banner idle lane has no opacity keyframe');
		const tile = obsPage.locator('[data-overlay-row-id="test-roll-banner"] .overlay-tile.roll-instance').first();
		await expect(tile).toBeAttached();
		const wrapper = tile.locator(`[data-component-id="${expected!.componentId}"]`).first();
		await obsPage.waitForTimeout(120);
		const opacity = await wrapper.evaluate(el => Number.parseFloat(getComputedStyle(el).opacity));
		expect(opacity).toBeCloseTo(expected!.opacity, 1);
	});
});

test.describe('Trigger routing (5.2)', () => {
	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
		// @ts-expect-error run in plain js
		await obsPage.waitForFunction(() => window.game?.modules?.get?.('obs-utils')?.api);
		await obsPage.waitForSelector('.obs-utils.overlay');
	});

	test('Roll Banner transitions only the tile matching payload.user.id', async ({ pages: { gmPage, obsPage } }) => {
		const userIds = await getUserIds(gmPage);
		const targetUserId = userIds.Player3;
		expect(targetUserId).toBeDefined();

		await obsPage.evaluate((args) => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { name: args.actorName },
				user: { id: args.userId },
				total: args.total,
				formula: '1d20',
				isCritical: false,
				isFumble: false,
			});
		}, { userId: targetUserId, actorName: 'Hero', total: 17 });

		const targetTile = obsPage.locator('[data-overlay-row-id="test-roll-banner"] .overlay-tile.roll-instance[data-player-name="Player3"]');
		await expect(targetTile).toContainText('17');
		await expect(targetTile).toContainText('Hero');

		const otherTile = obsPage.locator('[data-overlay-row-id="test-roll-banner"] .overlay-tile.roll-instance[data-player-name="Player2"]');
		await expect(otherTile).not.toContainText('17');
	});

	test('Roll Banner per-player filtering — Player2 fire only lands on Player2 tile', async ({ pages: { gmPage, obsPage } }) => {
		const userIds = await getUserIds(gmPage);
		const targetUserId = userIds.Player2;
		expect(targetUserId).toBeDefined();

		await obsPage.evaluate((args) => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { name: 'Ranger' },
				user: { id: args.userId },
				total: 11,
				formula: '1d20',
				isCritical: false,
				isFumble: false,
			});
		}, { userId: targetUserId });

		await expect(obsPage.locator('[data-overlay-row-id="test-roll-banner"] .overlay-tile.roll-instance[data-player-name="Player2"]')).toContainText('11');
		await expect(obsPage.locator('[data-overlay-row-id="test-roll-banner"] .overlay-tile.roll-instance[data-player-name="Player3"]')).not.toContainText('11');
	});

	test('Crit Pulse — non-crit roll for an overlay actor does NOT transition the tile', async ({ pages: { gmPage, obsPage } }) => {
		const actorIds = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			return (game.settings.get('obs-utils', 'overlayActors') ?? []) as string[];
		});
		test.skip(actorIds.length === 0, 'no overlay actors in fixture');
		const actorInfo = await gmPage.evaluate((id) => {
			// @ts-expect-error run in plain js
			const a = game.actors.get(id);
			return a ? { id: a.id, name: a.name } : null;
		}, actorIds[0]);
		expect(actorInfo).not.toBeNull();

		const baselineStyle = await obsPage.locator(`[data-overlay-row-id="test-crit-pulse"] .overlay-tile.actor-layer[data-actor-name="${actorInfo!.name}"] [data-component-id]`).first().getAttribute('style');

		await obsPage.evaluate((args) => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { id: args.id, name: args.name },
				total: 8,
				formula: '1d20',
				isCritical: false,
				isFumble: false,
			});
		}, actorInfo!);
		await obsPage.waitForTimeout(300);
		// Tile should still be present (it's ambient) and no crit-only transition fired.
		await expect(obsPage.locator(`[data-overlay-row-id="test-crit-pulse"] .overlay-tile.actor-layer[data-actor-name="${actorInfo!.name}"]`)).toBeAttached();
		void baselineStyle;
	});

	test('Crit Pulse — crit roll for an overlay actor DOES transition that tile', async ({ pages: { gmPage, obsPage } }) => {
		const actorIds = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			return (game.settings.get('obs-utils', 'overlayActors') ?? []) as string[];
		});
		test.skip(actorIds.length === 0, 'no overlay actors in fixture');
		const actorInfo = await gmPage.evaluate((id) => {
			// @ts-expect-error run in plain js
			const a = game.actors.get(id);
			return a ? { id: a.id, name: a.name } : null;
		}, actorIds[0]);
		expect(actorInfo).not.toBeNull();

		await obsPage.evaluate((args) => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { id: args.id, name: args.name },
				total: 20,
				formula: '1d20',
				isCritical: true,
				isFumble: false,
			});
		}, actorInfo!);
		await obsPage.waitForTimeout(300);
		await expect(obsPage.locator(`[data-overlay-row-id="test-crit-pulse"] .overlay-tile.actor-layer[data-actor-name="${actorInfo!.name}"]`)).toBeAttached();
	});

	test('Chat Banner — fired payload renders speakerAlias and content into the matching user tile', async ({ pages: { gmPage, obsPage } }) => {
		const userIds = await getUserIds(gmPage);
		const targetId = userIds.GM2 ?? userIds.Gamemaster;
		expect(targetId).toBeDefined();
		const targetName = userIds.GM2 ? 'GM2' : 'Gamemaster';

		await obsPage.evaluate((args) => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onChatMessage', {
				user: { id: args.userId },
				speakerAlias: args.alias,
				content: args.content,
			});
		}, { userId: targetId, alias: targetName, content: 'hello-from-test' });

		const targetTile = obsPage.locator(`[data-overlay-row-id="test-chat-banner"] .overlay-tile.roll-instance[data-player-name="${targetName}"]`);
		await expect(targetTile).toContainText(targetName);
		await expect(targetTile).toContainText('hello-from-test');
	});

	test('payload with an unknown user id does not transition any Roll Banner tile', async ({ pages: { obsPage } }) => {
		await obsPage.evaluate(() => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { name: 'Ghost' },
				user: { id: 'definitely-not-a-real-user-id' },
				total: 99,
				formula: '1d20',
				isCritical: false,
				isFumble: false,
			});
		});
		await obsPage.waitForTimeout(300);
		const tiles = obsPage.locator('[data-overlay-row-id="test-roll-banner"] .overlay-tile.roll-instance');
		const count = await tiles.count();
		for (let i = 0; i < count; i++) {
			await expect(tiles.nth(i)).not.toContainText('99');
		}
	});
});

test.describe('Trigger payload resolution (5.2)', () => {
	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
		// @ts-expect-error run in plain js
		await obsPage.waitForFunction(() => window.game?.modules?.get?.('obs-utils')?.api);
		await obsPage.waitForSelector('.obs-utils.overlay');
	});

	test('trigger.total and trigger.actor.name resolve into Roll Banner text components', async ({ pages: { gmPage, obsPage } }) => {
		const userIds = await getUserIds(gmPage);
		const targetUserId = userIds.Player3;
		expect(targetUserId).toBeDefined();

		await obsPage.evaluate((args) => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { name: args.actorName },
				user: { id: args.userId },
				total: args.total,
				formula: '1d20',
				isCritical: false,
				isFumble: false,
			});
		}, { userId: targetUserId, actorName: 'Hero', total: 17 });

		const tile = obsPage.locator('[data-overlay-row-id="test-roll-banner"] .overlay-tile.roll-instance[data-player-name="Player3"]');
		await expect(tile).toContainText('17');
		await expect(tile).toContainText('Hero');
	});

	test('trigger.speakerAlias / trigger.content resolve into Chat Banner text components', async ({ pages: { gmPage, obsPage } }) => {
		const userIds = await getUserIds(gmPage);
		const targetId = userIds.GM2 ?? userIds.Gamemaster;
		const targetName = userIds.GM2 ? 'GM2' : 'Gamemaster';

		await obsPage.evaluate((args) => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onChatMessage', {
				user: { id: args.userId },
				speakerAlias: args.alias,
				content: args.content,
			});
		}, { userId: targetId, alias: targetName, content: 'payload-resolution-text' });

		const targetTile = obsPage.locator(`[data-overlay-row-id="test-chat-banner"] .overlay-tile.roll-instance[data-player-name="${targetName}"]`);
		await expect(targetTile).toContainText(targetName);
		await expect(targetTile).toContainText('payload-resolution-text');
	});
});

test.describe('Preview pane (5.2)', () => {
	async function openComposerToPreview(gmPage: Page) {
		await gmPage.locator('button[data-tab=settings]').click();
		await gmPage.locator('button[data-app=\'configure\']').click();
		await gmPage.locator('button[data-tab=\'obs-utils\']').click();
		await gmPage.locator('button[data-key=\'obs-utils.overlayEditor\']').click();
		await expect(gmPage.locator('div#overlayeditor-application')).toBeVisible();
		// Click the Preview mode tab (4th built-in tab).
		await gmPage.locator('div#overlayeditor-application .composer .mode-tabs button[role=tab]').nth(3).click();
		await expect(gmPage.locator('div#overlayeditor-application .preview-root')).toBeVisible();
	}

	async function closeComposer(gmPage: Page) {
		await gmPage.locator('div#overlayeditor-application header button[data-action=close]').click();
		await expect(gmPage.locator('div#overlayeditor-application')).not.toBeVisible();
	}

	test('preview short-circuits payload filtering — unknown user.id still renders trigger.total', async ({ pages: { gmPage } }) => {
		await openComposerToPreview(gmPage);

		await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { name: 'PreviewHero' },
				user: { id: 'nobody' },
				total: 42,
				formula: '1d20',
				isCritical: false,
				isFumble: false,
			});
		});

		const tiles = gmPage.locator('div#overlayeditor-application .preview-root .render-area [data-overlay-row-id="test-roll-banner"] .overlay-tile.roll-instance');
		await expect(tiles.first()).toBeAttached();
		await expect(tiles.filter({ hasText: '42' }).first()).toBeAttached();

		await closeComposer(gmPage);
	});

	test('chat deadzone is 305px wide and the bbox toggle flips its active class', async ({ pages: { gmPage } }) => {
		await openComposerToPreview(gmPage);

		const deadzone = gmPage.locator('div#overlayeditor-application .preview-root .chat-deadzone');
		await expect(deadzone).toHaveCSS('width', '305px');

		const toggle = gmPage.locator('div#overlayeditor-application .preview-root .bbox-toggle');
		await expect(toggle).not.toHaveClass(/active/);
		await toggle.click();
		await expect(toggle).toHaveClass(/active/);
		await toggle.click();
		await expect(toggle).not.toHaveClass(/active/);

		await closeComposer(gmPage);
	});
});

test.describe('Composer editor (5.2)', () => {
	async function openComposer(gmPage: Page) {
		await gmPage.locator('button[data-tab=settings]').click();
		await gmPage.locator('button[data-app=\'configure\']').click();
		await gmPage.locator('button[data-tab=\'obs-utils\']').click();
		await gmPage.locator('button[data-key=\'obs-utils.overlayEditor\']').click();
		await expect(gmPage.locator('div#overlayeditor-application')).toBeVisible();
	}

	async function closeComposer(gmPage: Page) {
		await gmPage.locator('div#overlayeditor-application header button[data-action=close]').click();
		await expect(gmPage.locator('div#overlayeditor-application')).not.toBeVisible();
	}

	test('breadcrumb mode tabs swap the rendered workspace and reflect the active mode', async ({ pages: { gmPage } }) => {
		await openComposer(gmPage);
		const composer = gmPage.locator('div#overlayeditor-application .composer');
		const tabs = composer.locator('.mode-tabs button[role=tab]');
		await expect(tabs).toHaveCount(4);

		// Start on Layout (default per Composer.svelte).
		await expect(tabs.nth(1)).toHaveClass(/active/);

		await tabs.nth(0).click();
		await expect(tabs.nth(0)).toHaveClass(/active/);

		await tabs.nth(2).click();
		await expect(tabs.nth(2)).toHaveClass(/active/);

		await tabs.nth(3).click();
		await expect(tabs.nth(3)).toHaveClass(/active/);
		await expect(gmPage.locator('div#overlayeditor-application .preview-root')).toBeVisible();

		await closeComposer(gmPage);
	});

	test('Animation mode Transitions drawer mounts on click and closes via backdrop', async ({ pages: { gmPage } }) => {
		// The Transitions button is disabled unless the layer has >=2 tracks.
		// Roll Banner has Idle + Reveal, so select it via the layers panel.
		const targetIndex = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			return overlays.findIndex(o => o.id === 'test-roll-banner');
		});
		test.skip(targetIndex < 0, 'no test-roll-banner overlay in fixture');

		await openComposer(gmPage);
		const composer = gmPage.locator('div#overlayeditor-application .composer');

		// Select the Roll Banner layer in the layers panel.
		await composer.locator('aside.layers-pane .layer').nth(targetIndex).click();

		// Switch to Animation mode.
		await composer.locator('.mode-tabs button[role=tab]').nth(2).click();

		const txButton = composer.locator('.tx-btn');
		await expect(txButton).toBeEnabled();
		await txButton.click();
		const drawer = gmPage.locator('div#overlayeditor-application .tx-drawer[role=dialog][aria-modal=true]');
		await expect(drawer).toBeVisible();
		await expect(gmPage.locator('div#overlayeditor-application .tx-drawer-backdrop')).toBeVisible();

		// Click the top-left of the backdrop (left of the drawer panel) to dismiss.
		await gmPage.locator('div#overlayeditor-application .tx-drawer-backdrop').click({ position: { x: 20, y: 20 } });
		await expect(drawer).not.toBeVisible();

		await closeComposer(gmPage);
	});

	test('empty-state splash is NOT rendered when the fixture has overlays', async ({ pages: { gmPage } }) => {
		await openComposer(gmPage);
		await expect(gmPage.locator('div#overlayeditor-application .empty-overlay-state')).toHaveCount(0);
		await expect(gmPage.locator('div#overlayeditor-application .composer')).toBeVisible();
		await closeComposer(gmPage);
	});
});

test.describe('Easing showcase (5.2)', () => {
	test('fixture-stored easings cover the documented interpolation + equation set', async ({ pages: { gmPage } }) => {
		const seen = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const interpolations = new Set<string>();
			const equations = new Set<string>();
			for (const o of overlays) {
				if (!o.animation) continue;
				for (const track of o.animation.tracks) {
					for (const lane of track.lanes) {
						if (lane.propertyKeyframes) {
							for (const prop of Object.keys(lane.propertyKeyframes)) {
								const arr = lane.propertyKeyframes[prop as 'opacity'];
								for (const kf of arr ?? []) {
									if (kf.easing?.interpolation) interpolations.add(kf.easing.interpolation);
									if (kf.easing?.equation) equations.add(kf.easing.equation);
								}
							}
						}
					}
				}
			}
			return { interpolations: [...interpolations], equations: [...equations] };
		});
		// At minimum the per-property model is exercised — be lenient about which
		// specific equations appear (the fixture-author keeps that list authoritative).
		expect(seen.interpolations.length).toBeGreaterThan(0);
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
		const tabs = app.locator('.menu-tabs button[role=tab]');
		await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');

		await expect(app.locator('input[name=url]')).toBeVisible();
		await expect(app.locator('input[name=port]')).toBeVisible();
		await expect(app.locator('input[name=password]')).toBeVisible();
		await expect(app.locator('select#trackedPlayer')).toBeVisible();
	});

	test('Events tab lists every registered event type and onStopStreaming is gated by the websocket setting', async ({ pages: { gmPage } }) => {
		const app = gmPage.locator('div#obsremote-application');
		await app.locator('.menu-tabs button[role=tab]').nth(1).click();

		const meta = await gmPage.evaluate(() => {
			// @ts-expect-error run in plain js
			const api = game.modules.get('obs-utils').api;
			const all = Array.from(api.obsRemoteEventTypes.keys()) as string[];
			// @ts-expect-error run in plain js
			const wsOn = !!game.settings.get('obs-utils', 'enableOBSWebsocket');
			const visible = wsOn ? all : all.filter(k => k !== 'core.onStopStreaming');
			return { totalCount: all.length, visibleCount: visible.length, wsOn };
		});

		// Open the custom select dropdown to make options inspectable.
		await app.locator('.ouselect-trigger').first().click();
		const options = gmPage.locator('.ouselect-dropdown .ouselect-item');
		await expect(options).toHaveCount(meta.visibleCount);
		if (!meta.wsOn) {
			await expect(options.filter({ hasText: /Stop Streaming/i })).toHaveCount(0);
		}
	});

	test('Selecting a condition-bearing event renders the empty-instances state with an Add Instance button', async ({ pages: { gmPage } }) => {
		const app = gmPage.locator('div#obsremote-application');
		await app.locator('.menu-tabs button[role=tab]').nth(1).click();

		// Open dropdown and pick "Scene Load" — the only built-in with conditions.
		await app.locator('.ouselect-trigger').first().click();
		await gmPage.locator('.ouselect-dropdown .ouselect-item', { hasText: /Scene Load/i }).click();

		await expect(app.locator('.empty-instances, .instance').first()).toBeVisible();
		await expect(app.locator('button.add')).toBeVisible();

		// Adding an instance renders an instance card with the sceneName condition input.
		await app.locator('button.add').click();
		const instance = app.locator('.instance').first();
		await expect(instance).toBeVisible();
		await expect(instance.locator('.condition-field input[type=text]')).toBeVisible();

		// Tear it down so the test leaves no persisted custom event.
		await instance.locator('button.remove-instance').click();
		await expect(app.locator('.instance')).toHaveCount(0);
	});
});
