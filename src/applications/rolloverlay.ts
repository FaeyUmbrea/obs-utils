import PlayerRollOverlayEditor from '../svelte/components/editors/PlayerRollOverlayEditor.svelte';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class RollOverlay extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	static override DEFAULT_OPTIONS = {
		classes: ['rolloverlayeditor', 'themed'],
		id: 'rolloverlayeditor-application',
		title: 'obs-utils.applications.rollOverlayEditor.name',
		position: {
			height: 600,
			width: 1000,
		},
		zIndex: 95,
		resizable: true,
		focusKeep: true,
	};

	protected override root = PlayerRollOverlayEditor;
}
