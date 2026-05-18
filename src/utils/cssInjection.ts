import type { OverlayComponentData, OverlayData } from './types.ts';
import { settings } from './settings.ts';
import { generateId } from './types.ts';

const STYLE_PREFIX = 'obs-utils-css-';
const GLOBAL_ID = `${STYLE_PREFIX}global`;
const ACTORS_ID = `${STYLE_PREFIX}actors`;
const OVERLAYS_ID = `${STYLE_PREFIX}overlays`;
const COMPONENTS_ID = `${STYLE_PREFIX}components`;

function getOrCreateStyleEl(id: string): HTMLStyleElement {
	let el = document.getElementById(id) as HTMLStyleElement | null;
	if (!el) {
		el = document.createElement('style');
		el.id = id;
		document.head.appendChild(el);
	}
	return el;
}

function setStyle(id: string, css: string) {
	const el = getOrCreateStyleEl(id);
	if (el.textContent !== css) el.textContent = css;
}

function buildOverlaysCSS(overlays: OverlayData[] | undefined): string {
	if (!overlays?.length) return '';
	const parts: string[] = [];
	for (const o of overlays) {
		if (!o?.customCSS || !o.id) continue;
		parts.push(`[data-overlay-id="${o.id}"] {\n${o.customCSS}\n}`);
	}
	return parts.join('\n\n');
}

function buildComponentsCSS(overlays: OverlayData[] | undefined): string {
	if (!overlays?.length) return '';
	const parts: string[] = [];
	for (const o of overlays) {
		if (!o?.components) continue;
		for (const c of o.components) {
			if (!c?.customCSS || !c.id) continue;
			parts.push(`[data-component-id="${c.id}"] {\n${c.customCSS}\n}`);
		}
	}
	return parts.join('\n\n');
}

function buildActorsCSS(map: Record<string, string> | undefined): string {
	if (!map) return '';
	const parts: string[] = [];
	for (const [actorId, css] of Object.entries(map)) {
		if (!css?.trim()) continue;
		parts.push(`#actor${actorId} {\n${css}\n}`);
	}
	return parts.join('\n\n');
}

let activeRenderers = 0;
let unsubs: Array<() => void> = [];

/**
 * Mounts the four obs-utils style tags into document.head and starts the
 * subscriptions that keep them in sync. Call from a renderer's onMount. Safe
 * to call multiple times — refcounted, only the first call installs.
 *
 * Gated so we don't pollute Foundry's document with our scoped CSS when no
 * overlay renderer is even live (e.g. /game without the editor open).
 */
export function activateCSSInjection() {
	activeRenderers++;
	if (activeRenderers > 1) return;

	const globalStore = settings.getStore('globalOverlayCSS');
	const actorsStore = settings.getStore('actorOverlayCSS');
	const overlaysStore = settings.getStore('streamOverlays');

	unsubs.push(globalStore.subscribe((value: string | undefined) => {
		// Auto-scope global CSS to the overlay-renderer subtree so a careless
		// rule like `.app { ... }` can't bleed into Foundry's UI or another
		// module's DOM. The scope is wide enough that nested selectors keep
		// working as users expect, but narrow enough to never escape.
		const css = value?.trim();
		setStyle(GLOBAL_ID, css ? `.overlay-renderer {\n${css}\n}` : '');
	}));
	unsubs.push(actorsStore.subscribe((value: Record<string, string> | undefined) => {
		setStyle(ACTORS_ID, buildActorsCSS(value));
	}));
	unsubs.push(overlaysStore.subscribe((value: OverlayData[] | undefined) => {
		setStyle(OVERLAYS_ID, buildOverlaysCSS(value));
		setStyle(COMPONENTS_ID, buildComponentsCSS(value));
	}));
}

/** Counterpart to {@link activateCSSInjection}. Removes style tags when the last renderer unmounts. */
export function deactivateCSSInjection() {
	activeRenderers = Math.max(0, activeRenderers - 1);
	if (activeRenderers > 0) return;
	for (const u of unsubs) u();
	unsubs = [];
	for (const id of [GLOBAL_ID, ACTORS_ID, OVERLAYS_ID, COMPONENTS_ID]) {
		document.getElementById(id)?.remove();
	}
}

/** Walk an overlays array and stamp missing IDs in place. Returns true if anything was changed. */
export function backfillIds(overlays: OverlayData[] | undefined): boolean {
	if (!overlays) return false;
	let changed = false;
	for (const o of overlays) {
		if (!o) continue;
		if (!o.id) {
			o.id = generateId();
			changed = true;
		}
		if (o.components) {
			for (const c of o.components) {
				if (!c) continue;
				if (!c.id) {
					c.id = generateId();
					changed = true;
				}
			}
		}
	}
	return changed;
}

// Re-exports to keep imports tidy elsewhere
export type { OverlayComponentData, OverlayData };
