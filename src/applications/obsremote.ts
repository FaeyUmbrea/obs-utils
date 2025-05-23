import { SvelteApplication } from '#runtime/svelte/application';
import OBSRemote from '../svelte/OBSRemote.svelte';

// @ts-expect-error mixins dont work
export default class OBSRemoteApplication extends SvelteApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['obsremote', 'themed'],
			id: 'obsremote-application',
			title: 'obs-utils.applications.obsRemote.name',
			height: 700,
			width: 520,
			focusAuto: false,
			svelte: {
				class: OBSRemote,
				target: document.body,
			},
		});
	}
}
