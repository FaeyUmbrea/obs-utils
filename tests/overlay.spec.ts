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

test.describe('Render parity', () => {
	// Snapshot the rendered positions of every actor row and every overlay
	// element on /stream. If a future change moves anything by even a pixel,
	// the snapshot diff catches it. Update with `playwright test -u` after a
	// deliberate layout change; otherwise treat a failure as a regression.

	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
		// Give the renderer + any GSAP entrance animations time to settle so
		// the snapshot reflects steady-state positions.
		await obsPage.waitForSelector('.obs-utils.overlay > .actor');
		await obsPage.waitForTimeout(1500);
	});

	test('actor + overlay positions match the stored baseline', async ({ pages: { obsPage } }) => {
		const positions = await obsPage.evaluate(() => {
			const round = (n: number) => Math.round(n);
			const actors = Array.from(document.querySelectorAll('.obs-utils.overlay > .actor')).map((el) => {
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

test.describe('Triggers (5.1)', () => {
	// Requires world fixtures from tests/world-prep.md:
	//  - WYSIWYG overlay named 'Test Trigger Roll' with trigger.eventKey 'core.onPlayerRoll',
	//    duration 2000ms, and components reading trigger.total + trigger.actor.name
	//  - WYSIWYG overlay named 'Test Trigger Crit Only' with conditions { isCritical: true }

	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
		// Wait for the API AND the overlay renderer's Svelte components to mount —
		// triggered overlays don't subscribe to the hook until their wrapper mounts.
		// @ts-expect-error run in plain js
		await obsPage.waitForFunction(() => window.game?.modules?.get?.('obs-utils')?.api);
		await obsPage.waitForSelector('.obs-utils.overlay > .actor');
	});

	async function findOverlayByName(page: Page, name: string) {
		return await page.evaluate((n) => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			const overlay = overlays.find(o => o.name === n);
			if (!overlay) return null;
			return { id: overlay.id, trigger: overlay.trigger };
		}, name);
	}

	test('triggered overlay is hidden before any matching event fires', async ({ pages: { gmPage, obsPage } }) => {
		const overlay = await findOverlayByName(gmPage, 'Test Trigger Roll');
		expect(overlay).not.toBeNull();
		expect(overlay!.trigger?.eventKey).toBe('core.onPlayerRoll');
		await expect(obsPage.locator(`[data-overlay-id="${overlay!.id}"]`)).toHaveCount(0);
	});

	test('triggered overlay becomes visible on fireOverlayTrigger and resolves trigger.X paths', async ({ pages: { gmPage, obsPage } }) => {
		const overlay = await findOverlayByName(gmPage, 'Test Trigger Roll');
		expect(overlay).not.toBeNull();

		const ACTOR_NAME = 'TestActor';
		const ROLL_TOTAL = 17;
		await obsPage.evaluate((args) => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { name: args.name },
				total: args.total,
				formula: '1d20',
				isCritical: false,
				isFumble: false,
			});
		}, { name: ACTOR_NAME, total: ROLL_TOTAL });

		const wrapper = obsPage.locator(`[data-overlay-id="${overlay!.id}"]`);
		await expect(wrapper).toBeVisible();
		await expect(wrapper).toContainText(String(ROLL_TOTAL));
		await expect(wrapper).toContainText(ACTOR_NAME);
	});

	test('triggered overlay auto-hides after the configured duration', async ({ pages: { gmPage, obsPage } }) => {
		const overlay = await findOverlayByName(gmPage, 'Test Trigger Roll');
		expect(overlay).not.toBeNull();
		const duration = overlay!.trigger?.duration ?? 2000;

		await obsPage.evaluate(() => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { name: 'X' }, total: 1, formula: '1d20', isCritical: false, isFumble: false,
			});
		});

		const wrapper = obsPage.locator(`[data-overlay-id="${overlay!.id}"]`);
		await expect(wrapper).toBeVisible();
		// Wait past the auto-hide window plus the exit transition.
		await obsPage.waitForTimeout(duration + 600);
		await expect(wrapper).toHaveCount(0);
	});

	test('conditions filter — non-crit roll does not fire the crit-only overlay', async ({ pages: { gmPage, obsPage } }) => {
		const overlay = await findOverlayByName(gmPage, 'Test Trigger Crit Only');
		expect(overlay).not.toBeNull();

		await obsPage.evaluate(() => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { name: 'NotCrit' }, total: 10, formula: '1d20', isCritical: false, isFumble: false,
			});
		});

		// Give the renderer a tick to (not) react.
		await obsPage.waitForTimeout(300);
		await expect(obsPage.locator(`[data-overlay-id="${overlay!.id}"]`)).toHaveCount(0);
	});

	test('conditions filter — crit roll DOES fire the crit-only overlay', async ({ pages: { gmPage, obsPage } }) => {
		const overlay = await findOverlayByName(gmPage, 'Test Trigger Crit Only');
		expect(overlay).not.toBeNull();

		await obsPage.evaluate(() => {
			// @ts-expect-error run in plain js
			game.modules.get('obs-utils').api.fireOverlayTrigger('core.onPlayerRoll', {
				actor: { name: 'Crit' }, total: 20, formula: '1d20', isCritical: true, isFumble: false,
			});
		});

		await expect(obsPage.locator(`[data-overlay-id="${overlay!.id}"]`)).toBeVisible();
	});
});

test.describe('Component animations (5.1)', () => {
	// Requires a WYSIWYG component with `animation.defaultState.entrance` configured
	// (see tests/world-prep.md). The test sniffs the wrapper element for GSAP-applied
	// inline styles after mount.

	test.beforeEach(async ({ pages: { obsPage } }) => {
		await obsPage.goto('/stream');
	});

	async function findAnimatedComponent(page: Page) {
		return await page.evaluate(() => {
			// @ts-expect-error run in plain js
			const overlays: OverlayData[] = game.settings.get('obs-utils', 'streamOverlays');
			for (let oi = 0; oi < overlays.length; oi++) {
				const o = overlays[oi];
				if (o.type !== 'wysiwyg' || !Array.isArray(o.components)) continue;
				for (let ci = 0; ci < o.components.length; ci++) {
					const c = o.components[ci] as any;
					if (c.animation?.defaultState?.entrance) {
						return { overlayIndex: oi, componentIndex: ci, duration: c.animation.defaultState.entrance.duration };
					}
				}
			}
			return null;
		});
	}

	test('animated component reaches the entrance end-state after the configured duration', async ({ pages: { gmPage, obsPage } }) => {
		const ref = await findAnimatedComponent(gmPage);
		expect(ref).not.toBeNull();
		const wrapper = obsPage.locator(`#wysiwyg-component-${ref!.overlayIndex}-${ref!.componentIndex}`);
		await expect(wrapper).toBeVisible();

		// Wait for the entrance animation to complete + a small grace window.
		await obsPage.waitForTimeout(ref!.duration + 200);

		// At end of entrance, opacity should be the keyframe-1 value (1 in the
		// world-prep fixture).
		const opacity = await wrapper.evaluate(el => Number.parseFloat(getComputedStyle(el).opacity));
		expect(opacity).toBeCloseTo(1, 1);
	});

	test('animated wrapper element has GSAP-applied inline styles (proves the runtime is wired)', async ({ pages: { gmPage, obsPage } }) => {
		const ref = await findAnimatedComponent(gmPage);
		expect(ref).not.toBeNull();
		const wrapper = obsPage.locator(`#wysiwyg-component-${ref!.overlayIndex}-${ref!.componentIndex}`);
		await expect(wrapper).toBeVisible();

		// GSAP writes the animating properties as inline style attributes on the
		// target element. If the runtime is wired, the wrapper carries something
		// in its inline style after the animation runs at least once.
		await obsPage.waitForTimeout(ref!.duration + 200);
		const inlineStyle = await wrapper.getAttribute('style');
		expect(inlineStyle).toBeTruthy();
		expect(inlineStyle!.length).toBeGreaterThan(0);
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

	test('expanding a keyframed preset shows the timeline editor with N markers', async ({ pages: { gmPage } }) => {
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

		// Expand the first preset row that carries an aria-expanded chevron.
		// World prep guarantees at least one keyframed preset exists; the
		// chevron is only rendered on rows the editor can expand.
		const firstChevron = director.locator('.preset button[aria-expanded]').first();
		await firstChevron.click();
		await expect(firstChevron).toHaveAttribute('aria-expanded', 'true');

		// The editor's timeline mounts inside the panel; markers count must match.
		const markers = director.locator('.kfe-marker');
		await expect(markers).toHaveCount(keyframeCount);

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

		const wrapper = obsPage.locator(`[data-overlay-id="${layer.id}"]`);
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

		const i = obsPage.locator(`[data-component-id="${comp.id}"] i`);
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

		const progress = obsPage.locator(`[data-component-id="${comp.id}"] progress`);
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

		const wrapper = obsPage.locator(`[data-component-id="${comp.id}"]`);
		await expect(wrapper).toHaveCSS('padding', '4px 8px');
		await expect(wrapper).toHaveCSS('border-radius', '4px');
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

		// Open the Svelecte dropdown to make options inspectable.
		await app.locator('.sv-control').click();
		const options = gmPage.locator('.sv-dropdown-content .sv-item--wrap');
		await expect(options).toHaveCount(meta.visibleCount);
		if (!meta.wsOn) {
			await expect(options.filter({ hasText: /Stop Streaming/i })).toHaveCount(0);
		}
	});

	test('Selecting a condition-bearing event renders the empty-instances state with an Add Instance button', async ({ pages: { gmPage } }) => {
		const app = gmPage.locator('div#obsremote-application');
		await app.locator('.menu-tabs button[role=tab]').nth(1).click();

		// Open dropdown and pick "Scene Load" — the only built-in with conditions.
		await app.locator('.sv-control').click();
		await gmPage.locator('.sv-dropdown-content .sv-item--wrap', { hasText: /Scene Load/i }).click();

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
