import ObsWebsocket from '../svelte/OBSWebsocket.svelte';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class OBSWebsocketApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	static override DEFAULT_OPTIONS = {
		classes: ['obswebsocket', 'themed'],
		id: 'obswebsocket-application',
		title: 'obs-utils.applications.obsWebsocket.name',
		tabs: [
			{
				navSelector: '.tabs',
				contentSelector: '.content',
				initial: 'onLoad',
			},
		],
		position: {
			width: 300,
		},
	};

	protected override root = ObsWebsocket;
}
