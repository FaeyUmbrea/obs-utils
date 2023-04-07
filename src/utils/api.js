import SingleLineOverlay from '../svelte/streamoverlays/SingleLineOverlay.svelte';
import PlaintextComponent from '../svelte/streamoverlays/overlaycomponents/PlaintextComponent.svelte';
import FAIconComponent from '../svelte/streamoverlays/overlaycomponents/FAIconComponent.svelte';
import ActorValComponent from '../svelte/streamoverlays/overlaycomponents/ActorValComponent.svelte';
import AVBoolDisplayComponent from '../svelte/streamoverlays/overlaycomponents/AVBoolDisplayComponent.svelte';
import SingleLineOverlayEditor from '../svelte/components/editors/SingleLineOverlayEditor.svelte';
import PlainEditor from '../svelte/components/editors/PlainEditor.svelte';
import AVEditor from '../svelte/components/editors/AVEditor.svelte';
import {getApi} from './helpers.js';
import PlayerRollOverlay from "../svelte/streamoverlays/PlayerRollOverlay.svelte";

export class ObsUtilsApi {
    overlayTypes;
    overlayTypeNames;

    singleInstanceOverlays;

    constructor() {
        this.overlayTypes = new Map();
        this.overlayTypeNames = new Map();
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
  overlayComponents;
  overlayComponentNames;
  overlayComponentEditors;
  overlayClass;
  overlayEditor;
  constructor(overlayClass, overlayEditor) {
    this.overlayComponents = new Map();
    this.overlayClass = overlayClass;
    this.overlayComponentNames = new Map();
    this.overlayEditor = overlayEditor;
    this.overlayComponentEditors = new Map();
  }

  registerOverlayComponent(
    key,
    readableName,
    type,
    editor = PlainEditor,
  ) {
    this.overlayComponents.set(key, type);
    this.overlayComponentEditors.set(key, editor);
    this.overlayComponentNames.set(key, readableName);
  }
}

export function registerDefaultTypes() {
  const singleLineOverlay = new OverlayType(SingleLineOverlay, SingleLineOverlayEditor);
  singleLineOverlay.registerOverlayComponent('pt', 'Plain Text', PlaintextComponent);
  singleLineOverlay.registerOverlayComponent('fai', 'Font Awesome Icon', FAIconComponent);
    singleLineOverlay.registerOverlayComponent('av', 'Actor Value', ActorValComponent, AVEditor);
    singleLineOverlay.registerOverlayComponent('bav', 'Boolean Actor Value', AVBoolDisplayComponent, AVEditor);

    // Register Legacy Names
    singleLineOverlay.overlayComponents.set('Plain Text', PlaintextComponent);
    singleLineOverlay.overlayComponents.set('Font Awesome Icon', FAIconComponent);
    singleLineOverlay.overlayComponents.set('Actor Value', ActorValComponent);
    singleLineOverlay.overlayComponents.set('Boolean Actor Value', AVBoolDisplayComponent);

    getApi().registerOverlayType('sl', 'Single Line', singleLineOverlay);
    getApi().overlayTypes.set('Single Line', singleLineOverlay);
    getApi().registerUniqueOverlay(PlayerRollOverlay);
}
