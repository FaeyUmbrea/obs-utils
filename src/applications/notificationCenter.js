import { SvelteApplication } from '#runtime/svelte/application';
import NotificationCenterUI from '../svelte/NotificationCenterUI.svelte';

export default class NotificationCenter extends SvelteApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['notification-center'],
			id: 'notification-application',
			title: 'OBS Utils Notification Center',
			height: 600,
			width: 900,
			resizable: true,
			svelte: {
				class: NotificationCenterUI,
				target: document.body,
			},
		});
	}
}
