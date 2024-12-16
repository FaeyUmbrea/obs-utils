import { SvelteApplication } from '#runtime/svelte/application';
import NotificationCenterUI from '../svelte/NotificationCenterUI.svelte';

export default class NotificationCenter extends SvelteApplication {
	constructor(notifications: Record<string, unknown>[], links: Record<string, unknown>[]) {
		super({
			classes: ['notification-center'],
			id: 'notification-application',
			title: 'ethereal-plane.ui.notification-application-title',
			height: 600,
			width: 900,
			resizable: true,
			svelte: {
				target: document.body,
				class: NotificationCenterUI,
				props: { notifications, links },
			},
		});
	}
}
