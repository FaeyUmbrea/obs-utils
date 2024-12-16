import OverlayRenderer from '../svelte/OverlayRenderer.svelte';
import { setupDiceSoNice } from './dice.js';
import '../less/overlayrenderer.styl';

export class OverlayData {
	type;
	components;
	style;

	constructor(type = 'sl', components = [], style = '') {
		this.type = type;
		this.components = components;
		this.style = style;
	}
}

export class OverlayComponentData {
	type;
	data;
	style;

	constructor(type = 'pt', data = '', style = '') {
		this.type = type;
		this.data = data;
		this.style = style;
	}
}

export function renderOverlays() {
	if (game?.actors instanceof Actors) {
		// eslint-disable-next-line no-new
		new OverlayRenderer({
			target: $('body').get(0)!,
		});
	}
	setupDiceSoNice().then(() => {});
}
