import ActorValComponent from '../svelte/streamoverlays/overlaycomponents/ActorValComponent.svelte';
import AVBoolIconComponent from '../svelte/streamoverlays/overlaycomponents/AVBoolIconComponent.svelte';
import AVBoolImageComponent from '../svelte/streamoverlays/overlaycomponents/AVBoolImageComponent.svelte';
import AVImageDisplayComponent from '../svelte/streamoverlays/overlaycomponents/AVImageDisplayComponent.svelte';
import AVMultiIconComponent from '../svelte/streamoverlays/overlaycomponents/AVMultiIconComponent.svelte';
import AVMultiImageComponent from '../svelte/streamoverlays/overlaycomponents/AVMultiImageComponent.svelte';
import FAIconComponent from '../svelte/streamoverlays/overlaycomponents/FAIconComponent.svelte';
import ProgressBarComponent from '../svelte/streamoverlays/overlaycomponents/ProgressBarComponent.svelte';
import PlayerRollOverlay from '../svelte/streamoverlays/PlayerRollOverlay.svelte';
import SingleLineOverlay from '../svelte/streamoverlays/SingleLineOverlay.svelte';
import { MODULE_ID } from './const.ts';
import { getApi, isOBS, setActorValues } from './helpers.ts';
import { getWebsocket } from './obs.ts';
import { getSetting, setSetting } from './settings.ts';

export class ObsUtilsApi {
	overlayTypes: Map<string, OverlayType>;
	overlayTypeNames: Map<string, string>;
	singleInstanceOverlays: Set<SvelteComponentConstructor>;
	constructor() {
		this.overlayTypes = new Map();
		this.overlayTypeNames = new Map();
		this.singleInstanceOverlays = new Set();
	}

	registerOverlayType(key: string, readableName: string, type: OverlayType) {
		this.overlayTypes.set(key, type);
		this.overlayTypeNames.set(key, readableName);
	}

	registerUniqueOverlay(overlay: SvelteComponentConstructor) {
		this.singleInstanceOverlays.add(overlay);
	}

	getSelectedActors() {
		return (game as ReadyGame | undefined)?.settings?.get(MODULE_ID, 'overlayActors');
	}

	async setSelectedActors(actorArray: string[]) {
		await setSetting('overlayActors', actorArray);
	}

	setAVData(actorValueArray) {
		setActorValues(actorValueArray);
	}

	getOBSWebsocketClient() {
		if (getSetting('allowWebsocketAPI')) {
			return getWebsocket();
		} else {
			return undefined;
		}
	}

	isOBS() {
		return isOBS();
	}
}

export class OverlayType {
	overlayEditor: SvelteComponentConstructor;
	overlayComponents: Map<string, SvelteComponentConstructor>;
	overlayClass: SvelteComponentConstructor;
	overlayComponentNames: Map<string, string>;
	overlayComponentEditors: Map<string, SvelteComponentConstructor>;
	compactEditorButtons: Map<string, boolean>;

	constructor(overlayClass: SvelteComponentConstructor) {
		this.overlayComponents = new Map();
		this.overlayClass = overlayClass;
		this.overlayComponentNames = new Map();
		this.overlayComponentEditors = new Map();
		this.compactEditorButtons = new Map();
	}

	registerOverlayEditor(editor: SvelteComponentConstructor) {
		this.overlayEditor = editor;
	}

	registerComponent(key: string, readableName: string, type: SvelteComponentConstructor) {
		this.overlayComponents.set(key, type);
		this.overlayComponentNames.set(key, readableName);
	}

	registerComponentEditor(key: string, editor: SvelteComponentConstructor, compactButtons: boolean = false) {
		this.overlayComponentEditors.set(key, editor);
		this.compactEditorButtons.set(key, compactButtons);
	}
}

export function registerDefaultTypes() {
	const singleLineOverlay = new OverlayType(SingleLineOverlay);
	singleLineOverlay.registerComponent(
		'pt',
		'obs-utils.overlays.plainText.name',
		ActorValComponent,
	);
	singleLineOverlay.registerComponent(
		'fai',
		'obs-utils.overlays.fontAwesomeIcon.name',
		FAIconComponent,
	);
	singleLineOverlay.registerComponent(
		'bav',
		'obs-utils.overlays.booleanAVIcon.name',
		AVBoolIconComponent,
	);
	singleLineOverlay.registerComponent(
		'bavimg',
		'obs-utils.overlays.booleanAVImage.name',
		AVBoolImageComponent,
	);
	singleLineOverlay.registerComponent(
		'img',
		'obs-utils.overlays.image.name',
		AVImageDisplayComponent,
	);
	singleLineOverlay.registerComponent(
		'micoav',
		'obs-utils.overlays.multiIconAV.name',
		AVMultiIconComponent,
	);
	singleLineOverlay.registerComponent(
		'mimgav',
		'obs-utils.overlays.multiImageAV.name',
		AVMultiImageComponent,
	);
	singleLineOverlay.registerComponent(
		'pb',
		'obs-utils.overlays.progressBar.name',
		ProgressBarComponent,
	);

	// Register Legacy Names
	singleLineOverlay.overlayComponents.set('Plain Text', ActorValComponent);
	singleLineOverlay.overlayComponents.set('Font Awesome Icon', FAIconComponent);
	singleLineOverlay.overlayComponents.set('Actor Value', ActorValComponent);
	singleLineOverlay.overlayComponents.set(
		'Boolean Actor Value',
		AVBoolIconComponent,
	);
	singleLineOverlay.overlayComponents.set('iav', AVImageDisplayComponent);
	singleLineOverlay.overlayComponents.set('av', ActorValComponent);

	getApi().registerOverlayType('sl', 'Single Line', singleLineOverlay);
	getApi().overlayTypes.set('Single Line', singleLineOverlay);
	getApi().registerUniqueOverlay(PlayerRollOverlay);
}
