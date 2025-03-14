import { SvelteApplication } from '#runtime/svelte/application';
import PlayerRollOverlayEditor from '../svelte/components/editors/PlayerRollOverlayEditor.svelte';

export default class RollOverlay extends SvelteApplication {
	dataArray = [];

	// @ts-expect-error Excessive stack depth
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['rolloverlayeditor'],
			id: 'rolloverlayeditor-application',
			title: 'obs-utils.applications.rollOverlayEditor.name',
			height: 600,
			width: 1000,
			zIndex: 95,
			resizable: true,
			focusKeep: true,
			svelte: {
				class: PlayerRollOverlayEditor,
				target: document.body,
			},
		});
	}
}
