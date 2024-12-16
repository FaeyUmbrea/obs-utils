import { SvelteApplication } from '#runtime/svelte/application';
import OverlayActorSelectUi from '../svelte/OverlayActorSelectUI.svelte';
import { settings } from '../utils/settings.ts';

export default class OverlayActorSelect extends SvelteApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['actorselect'],
			id: 'actorselect-application',
			title: 'obs-utils.applications.actorSelect.name',
			tabs: [
				{
					navSelector: '.tabs',
					contentSelector: '.content',
					initial: 'onLoad',
				},
			],
			height: 300,
			width: 400,
			resizable: true,
			svelte: {
				class: OverlayActorSelectUi,
				target: document.body,
			},
		});
	}

	_getHeaderButtons() {
		const buttons = super._getHeaderButtons();

		buttons.unshift({
			icon: 'fas fa-rotate',
			title: 'obs-utils.applications.actorSelect.resetButton',
			label: 'obs-utils.applications.actorSelect.resetButton',

			onPress() {
				settings.getStore('overlayActors').set([]);
			},
		});
		return buttons;
	}
}
