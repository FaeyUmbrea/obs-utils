import { SvelteApplication } from '#runtime/svelte/application';
import DirectorApp from '../svelte/DirectorApp.svelte';

// @ts-expect-error mixins dont work
export default class DirectorApplication extends SvelteApplication {
	sidebarButton;

	constructor(sidebarButton: any) {
		super();
		this.sidebarButton = sidebarButton;
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['obs-director', 'themed'],
			minimizable: true,
			width: 555,
			height: 400,
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

	async close(options?: Application.CloseOptions) {
		await super.close(options);
		$('[data-tool=openStreamDirector]').removeClass('active');
		this.sidebarButton.active = false;
	}
}
