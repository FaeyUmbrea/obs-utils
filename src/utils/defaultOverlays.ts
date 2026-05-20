import { OverlayComponentData, OverlayData } from './types.ts';

export function getExampleOverlay(): OverlayData {
	const nameComp = new OverlayComponentData();
	nameComp.type = 'pt';
	nameComp.data = 'name';
	nameComp.x = 760;
	nameComp.y = 20;
	nameComp.w = 400;
	nameComp.h = 40;

	const hpBar = new OverlayComponentData();
	hpBar.type = 'pb';
	hpBar.data = 'system.attributes.hp.value;system.attributes.hp.max';
	hpBar.x = 660;
	hpBar.y = 1020;
	hpBar.w = 600;
	hpBar.h = 30;

	const overlay = new OverlayData('wysiwyg', [nameComp, hpBar], '', { w: 1920, h: 1080 });
	return overlay;
}

// ─── Starter overlay registry ─────────────────────────────────────────────────
// System companion modules can register a system-specific starter set, replacing
// the generic default. The burger menu in the overlay editor imports whichever
// is registered (or the default if nothing is).

let registeredStarter: OverlayData[] | undefined;

/** Public — system modules call this in their init hook. Last writer wins. */
export function registerStarter(overlays: OverlayData[]): void {
	registeredStarter = overlays;
}

/** Used by the import-starter UI to materialize the current set. */
export function readStarterOverlays(): OverlayData[] {
	return registeredStarter ?? [getExampleOverlay()];
}
