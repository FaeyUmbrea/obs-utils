import { mount } from 'svelte';
import OverlayRenderer from '../svelte/OverlayRenderer.svelte';
import { setupDiceSoNice } from './dice.ts';
import '../less/overlayrenderer.styl';

export function renderOverlays() {
	if ((game as ReadyGame | undefined)?.actors instanceof foundry.documents.collections.Actors) {
		mount(OverlayRenderer, { target: $('body').get(0)! });
	}
	setupDiceSoNice().then(() => {});
}
