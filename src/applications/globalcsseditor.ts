import type { ReadyGame } from 'fvtt-types/configuration';
import GlobalCSSEditorUI from '../svelte/composer/GlobalCSSEditorUI.svelte';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class GlobalCSSEditor extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	static override DEFAULT_OPTIONS = {
		classes: ['globalcsseditor', 'themed'],
		id: 'globalcsseditor-application',
		title: (game as ReadyGame).i18n.localize('obs-utils.applications.globalCSSEditor.name'),
		position: {
			height: 600,
			width: 800,
		},
		zIndex: 96,
		focusAuto: false,
		window: {
			resizable: true,
		},
	};

	protected override root = GlobalCSSEditorUI;
}
