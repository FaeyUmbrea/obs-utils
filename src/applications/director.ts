import { SvelteApplication } from '#runtime/svelte/application';
import DirectorApp from '../svelte/DirectorApp.svelte';

export default class DirectorApplication extends SvelteApplication {
	sidebarButton;

	constructor(sidebarButton) {
		super();
		this.sidebarButton = sidebarButton;
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['obs-director'],
			minimizable: true,
			width: 315,
			height: 435,
			id: 'director-application',
			title: 'obs-utils.applications.director.name',
			positionOrtho: false,
			transformOrigin: null,
			svelte: {
				class: DirectorApp,
				target: document.body,
				intro: true,
			},
		});
	}

	async close(options) {
		await super.close(options);
		$('[data-tool=openStreamDirector]').removeClass('active');
		this.sidebarButton.active = false;
	}
}
