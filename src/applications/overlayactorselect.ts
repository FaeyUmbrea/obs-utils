import OverlayActorSelectUi from '../svelte/OverlayActorSelectUI.svelte';
import { settings } from '../utils/settings.ts';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class OverlayActorSelect extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	static override DEFAULT_OPTIONS = {
		classes: ['actorselect', 'themed'],
		id: 'actorselect-application',
		title: 'obs-utils.applications.actorSelect.name',
		tabs: [
			{
				navSelector: '.tabs',
				contentSelector: '.content',
				initial: 'onLoad',
			},
		],
		position: {
			height: 500,
			width: 800,
		},
		resizable: false,
		actions: {
			reset: OverlayActorSelect.reset,
		},
		window: {
			controls: [
				{
					icon: 'fas fa-rotate',
					label: 'obs-utils.applications.actorSelect.resetButton',
					action: 'reset',
				},
			],
		},
	};

	protected override root = OverlayActorSelectUi;

	public static reset() {
		settings.getStore('overlayActors')?.set([]);
	}
}
