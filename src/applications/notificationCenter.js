import {SvelteApplication} from "@typhonjs-fvtt/runtime/_dist/svelte/application/index.js";
import NotificationCenterUI from "../svelte/NotificationCenterUI.svelte";

export default class OverlayActorSelect extends SvelteApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['notification-center'],
            id: 'notification-application',
            title: 'OBS Remote Settings',
            height: 700,
            width: 520,
            svelte: {
                class: NotificationCenterUI,
                target: document.body
            }
        });
    }
}