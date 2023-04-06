import { getSetting, setSetting } from '../utils/settings';
import OverlayEditorUI from '../svelte/OverlayEditorUI.svelte';
import {SvelteApplication} from "@typhonjs-fvtt/runtime/svelte/application";

export default class OverlayEditor extends SvelteApplication {
    dataArray = [];

    async _updateObject(_event, formData) {
        if (formData === undefined) throw new Error('Form Data Empty');
    }


    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['overlayeditor'],
            id: 'overlayeditor-application',
            title: 'Overlay Editor',
            //tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
            height: 600,
            width: 1000,
            zIndex: 95,
            resizable: true,
            focusKeep: true,
            svelte: {
                class: OverlayEditorUI,
                target: document.body
            }
        });
  }
}
