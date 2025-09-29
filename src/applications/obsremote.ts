import OBSRemote from '../svelte/OBSRemote.svelte';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class OBSRemoteApplication extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	static override DEFAULT_OPTIONS = {
		classes: ['obsremote', 'themed'],
		id: 'obsremote-application',
		title: 'obs-utils.applications.obsRemote.name',
		position: {
			height: 700,
			width: 520,
		},
		focusAuto: false,
	};

	protected override root = OBSRemote;
}
