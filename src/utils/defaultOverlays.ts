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
