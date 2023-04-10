import SingleLineOverlay from '../svelte/streamoverlays/SingleLineOverlay.svelte';
import PlaintextComponent from '../svelte/streamoverlays/overlaycomponents/PlaintextComponent.svelte';
import FAIconComponent from '../svelte/streamoverlays/overlaycomponents/FAIconComponent.svelte';
import ActorValComponent from '../svelte/streamoverlays/overlaycomponents/ActorValComponent.svelte';
import AVBoolDisplayComponent from '../svelte/streamoverlays/overlaycomponents/AVBoolDisplayComponent.svelte';
import {getApi} from './helpers.js';
import PlayerRollOverlay from "../svelte/streamoverlays/PlayerRollOverlay.svelte";

export class ObsUtilsApi {

    constructor() {
        /**
         * @type {Map<string, OverlayType>}
         */
        this.overlayTypes = new Map();
        /**
         * @type {Map<string, OverlayType>}
         */
        this.overlayTypeNames = new Map();
        /**
         * @type {Map<string, OverlayType>}
         */
        this.singleInstanceOverlays = new Set();
    }

    registerOverlayType(key, readableName, type) {
        this.overlayTypes.set(key, type);
        this.overlayTypeNames.set(key, readableName);
    }

    registerUniqueOverlay(overlay) {
        this.singleInstanceOverlays.add(overlay);
    }
}

export class OverlayType {
    overlayEditor;

    constructor(overlayClass) {
        this.overlayComponents = new Map();
        this.overlayClass = overlayClass;
        this.overlayComponentNames = new Map();
        this.overlayComponentEditors = new Map();
    }

    registerOverlayEditor(editor) {
        this.overlayEditor = editor;
    }

    /**
     * @param key {string} The id of the Component
     * @param readableName {string} The readable Name for the component
     * @param type {SvelteComponent} The class for the Component
     */
    registerComponent(key, readableName, type) {
        this.overlayComponents.set(key, type);
        this.overlayComponentNames.set(key, readableName);
    }

    /**
     * @param key {string} The id of the Component
     * @param editor {SvelteComponent} The class for the Editor
     */
    registerComponentEditor(key, editor) {
        this.overlayComponentEditors.set(key, editor);
    }
}

export function registerDefaultTypes() {
    const singleLineOverlay = new OverlayType(SingleLineOverlay);
    singleLineOverlay.registerComponent('pt', 'Plain Text', PlaintextComponent);
    singleLineOverlay.registerComponent('fai', 'Font Awesome Icon', FAIconComponent);
    singleLineOverlay.registerComponent('av', 'Actor Value', ActorValComponent);
    singleLineOverlay.registerComponent('bav', 'Boolean Actor Value', AVBoolDisplayComponent);

    // Register Legacy Names
    singleLineOverlay.overlayComponents.set('Plain Text', PlaintextComponent);
    singleLineOverlay.overlayComponents.set('Font Awesome Icon', FAIconComponent);
    singleLineOverlay.overlayComponents.set('Actor Value', ActorValComponent);
    singleLineOverlay.overlayComponents.set('Boolean Actor Value', AVBoolDisplayComponent);

    getApi().registerOverlayType('sl', 'Single Line', singleLineOverlay);
    getApi().overlayTypes.set('Single Line', singleLineOverlay);
    getApi().registerUniqueOverlay(PlayerRollOverlay);
}
