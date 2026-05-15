import type { ReadyGame } from 'fvtt-types/configuration';
import OverlayPreviewUI from '../svelte/OverlayPreviewUI.svelte';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class OverlayPreview extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	static override DEFAULT_OPTIONS = {
		classes: ['overlaypreview', 'themed'],
		id: 'overlaypreview-application',
		title: (game as ReadyGame).i18n.localize('obs-utils.applications.overlayPreview.name'),
		position: {
			height: 600,
			width: 1100,
		},
		zIndex: 95,
		focusAuto: false,
		window: {
			resizable: true,
		},
	};

	protected override root = OverlayPreviewUI;
}
