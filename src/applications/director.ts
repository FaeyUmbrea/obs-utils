import type { DeepPartial } from 'fvtt-types/utils';
import DirectorApp from '../svelte/DirectorApp.svelte';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class DirectorApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	sidebarButton;

	protected override root = DirectorApp;

	constructor(options: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>, sidebarButton: any) {
		super(options);
		this.sidebarButton = sidebarButton;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['obs-director', 'themed'],
		minimizable: true,
		position: {
			width: 555,
			height: 400,
		},
		id: 'director-application',
		title: 'obs-utils.applications.director.name',
		positionOrtho: false,
		transformOrigin: null,
	};

	override async close(options?: DeepPartial<foundry.applications.api.ApplicationV2.ClosingOptions>) {
		await super.close(options);
		$('[data-tool=openStreamDirector]').removeClass('active');
		this.sidebarButton.active = false;
		return this;
	}
}
