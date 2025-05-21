import { SvelteApplication } from '#runtime/svelte/application';
import ObsWebsocket from '../svelte/OBSWebsocket.svelte';

// @ts-expect-error mixins dont work
export default class OBSWebsocketApplication extends SvelteApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
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
			svelte: {
				class: ObsWebsocket,
				target: document.body,
			},
			width: 300,
		});
	}
}
