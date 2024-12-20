import OverlayRenderer from '../svelte/OverlayRenderer.svelte';
import { setupDiceSoNice } from './dice.ts';
import '../less/overlayrenderer.styl';

export function renderOverlays() {
	if (game?.actors instanceof Actors) {
		// eslint-disable-next-line no-new
		new OverlayRenderer({
			target: $('body').get(0)!,
		});
	}
	setupDiceSoNice().then(() => {});
}
