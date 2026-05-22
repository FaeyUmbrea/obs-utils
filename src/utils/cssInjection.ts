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

// Refcounted — first call mounts the style tags, last unmount tears them down.
export function activateCSSInjection() {
	activeRenderers++;
	if (activeRenderers > 1) return;

	const globalStore = settings.getStore('globalOverlayCSS');
	const actorsStore = settings.getStore('actorOverlayCSS');
	const overlaysStore = settings.getStore('streamOverlays');

	unsubs.push(globalStore.subscribe((value: string | undefined) => {
		// Auto-scope under .overlay-renderer so a careless rule can't bleed into Foundry's UI.
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

export function deactivateCSSInjection() {
	activeRenderers = Math.max(0, activeRenderers - 1);
	if (activeRenderers > 0) return;
	for (const u of unsubs) u();
	unsubs = [];
	for (const id of [GLOBAL_ID, ACTORS_ID, OVERLAYS_ID, COMPONENTS_ID]) {
		document.getElementById(id)?.remove();
	}
}

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

export type { OverlayComponentData, OverlayData };
