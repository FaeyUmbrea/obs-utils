import type { SvelteComponent } from 'svelte';
import SingleLineOverlay from '../svelte/streamoverlays/SingleLineOverlay.svelte';
import PlaintextComponent from '../svelte/streamoverlays/overlaycomponents/PlaintextComponent.svelte';
import FAIconComponent from '../svelte/streamoverlays/overlaycomponents/FAIconComponent.svelte';
import ActorValComponent from '../svelte/streamoverlays/overlaycomponents/ActorValComponent.svelte';
import AVBoolDisplayComponent from '../svelte/streamoverlays/overlaycomponents/AVBoolDisplayComponent.svelte';
import SingleLineOverlayEditor from '../svelte/components/editors/SingleLineOverlayEditor.svelte';
import PlainEditor from '../svelte/components/editors/PlainEditor.svelte';
import AVEditor from '../svelte/components/editors/AVEditor.svelte';

export class ObsUtilsApi {
  overlayTypes: Map<string, OverlayType>;
  overlayTypeNames: Map<string, string>;

  constructor() {
    this.overlayTypes = new Map<string, OverlayType>();
    this.overlayTypeNames = new Map<string, string>();
  }
  registerOverlayType(key: string, readableName: string, type: OverlayType) {
    this.overlayTypes.set(key, type);
    this.overlayTypeNames.set(key, readableName);
  }
}

export class OverlayType {
  overlayComponents: Map<string, typeof SvelteComponent>;
  overlayComponentNames: Map<string, string>;
  overlayComponentEditors: Map<string, typeof SvelteComponent>;
  overlayClass: typeof SvelteComponent;
  overlayEditor: typeof SvelteComponent;
  constructor(overlayClass: typeof SvelteComponent, overlayEditor: typeof SvelteComponent) {
    this.overlayComponents = new Map<string, typeof SvelteComponent>();
    this.overlayClass = overlayClass;
    this.overlayComponentNames = new Map<string, string>();
    this.overlayEditor = overlayEditor;
    this.overlayComponentEditors = new Map<string, typeof SvelteComponent>();
  }

  registerOverlayComponent(
    key: string,
    readableName: string,
    type: typeof SvelteComponent,
    editor: typeof SvelteComponent = PlainEditor,
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

  window.obsutils.registerOverlayType('sl', 'Single Line', singleLineOverlay);
  window.obsutils.overlayTypes.set('Single Line', singleLineOverlay);
}
