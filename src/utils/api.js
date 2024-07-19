import SingleLineOverlay from "../svelte/streamoverlays/SingleLineOverlay.svelte";
import FAIconComponent from "../svelte/streamoverlays/overlaycomponents/FAIconComponent.svelte";
import ActorValComponent from "../svelte/streamoverlays/overlaycomponents/ActorValComponent.svelte";
import AVBoolIconComponent from "../svelte/streamoverlays/overlaycomponents/AVBoolIconComponent.svelte";
import { getApi, setActorValues } from "./helpers.js";
import PlayerRollOverlay from "../svelte/streamoverlays/PlayerRollOverlay.svelte";
import AVImageDisplayComponent from "../svelte/streamoverlays/overlaycomponents/AVImageDisplayComponent.svelte";
import { getSetting, setSetting } from "./settings.js";
import AVMultiIconComponent from "../svelte/streamoverlays/overlaycomponents/AVMultiIconComponent.svelte";
import AVMultiImageComponent from "../svelte/streamoverlays/overlaycomponents/AVMultiImageComponent.svelte";
import ProgressBarComponent from "../svelte/streamoverlays/overlaycomponents/ProgressBarComponent.svelte";
import AVBoolImageComponent from "../svelte/streamoverlays/overlaycomponents/AVBoolImageComponent.svelte";

export class ObsUtilsApi {
  actorValues = [];
  constructor() {
    /**
     * @type {Map<string, OverlayType>}
     */
    this.overlayTypes = new Map();
    /**
     * @type {Map<string, string>}
     */
    this.overlayTypeNames = new Map();
    /**
     * @type {Map<string, OverlayType>}
     */
    this.singleInstanceOverlays = new Set();
  }

  /**
   *
   * @param key {string} The id of the Overlay
   * @param readableName {string} The readable Name for the overlay
   * @param type {OverlayType} The class for the Overlay
   */
  registerOverlayType(key, readableName, type) {
    this.overlayTypes.set(key, type);
    this.overlayTypeNames.set(key, readableName);
  }

  /**
   * @param overlay {SvelteComponent} The class for the Overlay
   */
  registerUniqueOverlay(overlay) {
    this.singleInstanceOverlays.add(overlay);
  }

  getSelectedActors() {
    return getSetting("overlayActors");
  }

  async setSelectedActors(actorArray) {
    await setSetting("overlayActors", actorArray);
  }

  setAVData(actorValueArray) {
    setActorValues(actorValueArray);
  }
}

export class OverlayType {
  overlayEditor;

  /**
   * @param overlayClass {SvelteComponent} The class for the Overlay
   */
  constructor(overlayClass) {
    this.overlayComponents = new Map();
    this.overlayClass = overlayClass;
    this.overlayComponentNames = new Map();
    this.overlayComponentEditors = new Map();
    this.compactEditorButtons = new Map();
  }

  /**
   * @param editor {SvelteComponent} The class for the Editor
   */
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
   * @param compactButtons {boolean} Do the buttons need to be compact?
   */
  registerComponentEditor(key, editor, compactButtons = false) {
    this.overlayComponentEditors.set(key, editor);
    this.compactEditorButtons.set(key, compactButtons);
  }
}

export function registerDefaultTypes() {
  const singleLineOverlay = new OverlayType(SingleLineOverlay);
  singleLineOverlay.registerComponent("pt", "Plain Text", ActorValComponent);
  singleLineOverlay.registerComponent(
    "fai",
    "Font Awesome Icon",
    FAIconComponent,
  );
  singleLineOverlay.registerComponent(
    "bav",
    "Boolean AV Icon",
    AVBoolIconComponent,
  );
  singleLineOverlay.registerComponent(
    "bavimg",
    "Boolean AV Image",
    AVBoolImageComponent,
  );
  singleLineOverlay.registerComponent("img", "Image", AVImageDisplayComponent);
  singleLineOverlay.registerComponent(
    "micoav",
    "Multi Icon AV",
    AVMultiIconComponent,
  );
  singleLineOverlay.registerComponent(
    "mimgav",
    "Multi Image AV",
    AVMultiImageComponent,
  );
  singleLineOverlay.registerComponent(
    "pb",
    "Progress Bar",
    ProgressBarComponent,
  );

  // Register Legacy Names
  singleLineOverlay.overlayComponents.set("Plain Text", ActorValComponent);
  singleLineOverlay.overlayComponents.set("Font Awesome Icon", FAIconComponent);
  singleLineOverlay.overlayComponents.set("Actor Value", ActorValComponent);
  singleLineOverlay.overlayComponents.set(
    "Boolean Actor Value",
    AVBoolIconComponent,
  );
  singleLineOverlay.overlayComponents.set("iav", AVImageDisplayComponent);
  singleLineOverlay.overlayComponents.set("av", ActorValComponent);

  getApi().registerOverlayType("sl", "Single Line", singleLineOverlay);
  getApi().overlayTypes.set("Single Line", singleLineOverlay);
  getApi().registerUniqueOverlay(PlayerRollOverlay);
}
