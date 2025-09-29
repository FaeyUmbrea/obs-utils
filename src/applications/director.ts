import type { DeepPartial } from 'fvtt-types/utils';
import DirectorApp from '../svelte/DirectorApp.svelte';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class DirectorApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	sidebarButton: SceneControls.Tool;

	protected override root = DirectorApp;

	constructor(options: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>, sidebarButton: SceneControls.Tool) {
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
		const close = super.close(options);
		this.sidebarButton.active = false;
		ui.controls?.render();
		return await close;
	}
}
