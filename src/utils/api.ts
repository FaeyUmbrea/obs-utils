import type { Component } from 'svelte';
import type { ActorValues } from './helpers.ts';
import type { CustomEventInstance } from './types.ts';
import FallbackEditor from '../svelte/components/editors/FallbackEditor.svelte';
import ActorValComponent from '../svelte/streamoverlays/overlaycomponents/ActorValComponent.svelte';
import AVBoolIconComponent from '../svelte/streamoverlays/overlaycomponents/AVBoolIconComponent.svelte';
import AVBoolImageComponent from '../svelte/streamoverlays/overlaycomponents/AVBoolImageComponent.svelte';
import AVImageDisplayComponent from '../svelte/streamoverlays/overlaycomponents/AVImageDisplayComponent.svelte';
import AVMultiIconComponent from '../svelte/streamoverlays/overlaycomponents/AVMultiIconComponent.svelte';
import AVMultiImageComponent from '../svelte/streamoverlays/overlaycomponents/AVMultiImageComponent.svelte';
import FAIconComponent from '../svelte/streamoverlays/overlaycomponents/FAIconComponent.svelte';
import ProgressBarComponent from '../svelte/streamoverlays/overlaycomponents/ProgressBarComponent.svelte';
import PlayerRollOverlay from '../svelte/streamoverlays/PlayerRollOverlay.svelte';
import PlayerRollOverlayEditor from '../svelte/components/editors/PlayerRollOverlayEditor.svelte';
import WYSIWYGOverlayEditor from '../svelte/components/editors/WYSIWYGOverlayEditor.svelte';
import SingleLineOverlay from '../svelte/streamoverlays/SingleLineOverlay.svelte';
import WYSIWYGOverlay from '../svelte/streamoverlays/WYSIWYGOverlay.svelte';
import { MODULE_ID } from './const.ts';
import { getApi, isOBS, setActorValues } from './helpers.ts';
import { getWebsocket } from './obs.ts';
import { getSetting, setSetting } from './settings.ts';

// ─── OBS Remote event type registry ───────────────────────────────────────
// A registration describes a single addressable event type that can be
// triggered by either obs-utils itself (the built-in events: onLoad,
// onCombatStart, etc.) or by a third-party system module that wants to
// expose its own conditional triggers (e.g. HP threshold, crit, fumble).

export interface OBSRemoteConditionField {
	/** Storage key on the configured instance's `conditions` object. */
	key: string;
	/** What the user fills in. */
	type: 'number' | 'string' | 'boolean';
	/**
	 * i18n key for the field label. Resolved via `game.i18n.localize()` at
	 * render time. Pass a literal string only if you are intentionally
	 * shipping a single-locale module — the UI will display it verbatim.
	 */
	label: string;
	/** Default value when a new instance is added. */
	default?: any;
}

export interface OBSRemoteEventTypeRegistration {
	/** Unique key — namespace with your module id (e.g. 'dnd5e.hpThreshold'). */
	key: string;
	/**
	 * i18n key for the section header. Resolved via `game.i18n.localize()`
	 * at render time. Pass a literal string only if you are intentionally
	 * shipping a single-locale module — the UI will display it verbatim.
	 */
	name: string;
	/** Optional Font Awesome icon class for the header (e.g. 'fas fa-heart'). */
	icon?: string;
	/** Per-instance condition fields the user fills in when configuring. */
	conditionFields?: OBSRemoteConditionField[];
	/**
	 * Decide whether a configured instance should fire given its saved
	 * `conditions` and the runtime `context` passed to triggerOBSRemoteEvent.
	 * Omit → instance always fires.
	 */
	matcher?: (conditions: Record<string, any>, context: any) => boolean;
}

export class ObsUtilsApi {
	overlayTypes: Map<string, OverlayType>;
	overlayTypeNames: Map<string, string>;
	singleInstanceOverlays: Set<Component>;
	singleInstanceOverlaysSvelte5: Set<Component>;
	obsRemoteEventTypes: Map<string, OBSRemoteEventTypeRegistration>;

	constructor() {
		this.overlayTypes = new Map();
		this.overlayTypeNames = new Map();
		this.singleInstanceOverlays = new Set();
		this.singleInstanceOverlaysSvelte5 = new Set();
		this.obsRemoteEventTypes = new Map();
	}

	/** Public — modules call this in their init hook to expose a new event type. */
	registerOBSRemoteEventType(reg: OBSRemoteEventTypeRegistration) {
		this.obsRemoteEventTypes.set(reg.key, reg);
	}

	/**
	 * Public — modules call this when their in-system condition fires
	 * (e.g. on `updateActor` with `system.attributes.hp.value` changed).
	 * Looks up every configured instance for the type, runs the matcher,
	 * and executes the configured OBS actions for instances that pass.
	 *
	 * Safe to call from any client; the actual OBS action execution is
	 * already gated to the OBS-mode client by triggerOBSAction.
	 */
	async triggerOBSRemoteEvent(key: string, context: Record<string, any> = {}) {
		const reg = this.obsRemoteEventTypes.get(key);
		if (!reg) return;
		const { triggerCustomEventInstances } = await import('./obs.ts');
		const instances = (getSetting('obsRemote') as any)?.customEvents?.[key] as CustomEventInstance[] | undefined;
		if (!instances?.length) return;
		await triggerCustomEventInstances(reg, instances, context);
	}

	registerOverlayType(key: string, readableName: string, type: OverlayType) {
		this.overlayTypes.set(key, type);
		this.overlayTypeNames.set(key, readableName);
	}

	// Legacy external component workflow (pre-Svelte 5)
	registerUniqueOverlay(overlay: Component) {
		this.singleInstanceOverlays.add(overlay);
	}

	// New Svelte 5 external component workflow
	registerUniqueOverlaySvelte5(overlay: Component) {
		this.singleInstanceOverlaysSvelte5.add(overlay);
	}

	getSelectedActors() {
		return (game as ReadyGame | undefined)?.settings?.get(MODULE_ID, 'overlayActors');
	}

	async setSelectedActors(actorArray: string[]) {
		await setSetting('overlayActors', actorArray);
	}

	setAVData(actorValueArray: ActorValues) {
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
	overlayEditor: Component;
	overlayComponents: Map<string, Component<any, any, any>>;
	overlayClass: Component;
	overlayComponentNames: Map<string, string>;
	overlayComponentEditors: Map<string, Component<any, any, any>>;
	compactEditorButtons: Map<string, boolean>;
	hasCustomOverlayEditor: boolean = false;
	perActor: boolean = true;

	constructor(overlayClass: Component<any, any, any>) {
		this.overlayComponents = new Map();
		this.overlayClass = overlayClass;
		this.overlayComponentNames = new Map();
		this.overlayComponentEditors = new Map();
		this.compactEditorButtons = new Map();
		this.overlayEditor = FallbackEditor;
	}

	registerOverlayEditor(editor: Component<any, any, any>) {
		this.overlayEditor = editor;
		this.hasCustomOverlayEditor = true;
	}

	/**
	 * Register a renderable component type for this overlay.
	 *
	 * @param key Stable key referenced from overlay data (e.g. 'pt', 'pb').
	 * @param readableName i18n key for the display label. Resolved via
	 *   `game.i18n.localize()` at render time. Pass a literal string only
	 *   if you intentionally ship a single-locale module.
	 * @param type The Svelte component class that renders the data.
	 */
	registerComponent(key: string, readableName: string, type: Component<any, any, any>) {
		this.overlayComponents.set(key, type);
		this.overlayComponentNames.set(key, readableName);
	}

	registerComponentEditor(key: string, editor: Component<any, any, any>, compactButtons: boolean = false) {
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

	getApi().registerOverlayType('sl', 'obs-utils.overlays.simpleOverlay.name', singleLineOverlay);
	getApi().overlayTypes.set('Single Line', singleLineOverlay);

	const wysiwygOverlay = new OverlayType(WYSIWYGOverlay);
	// Component renderers + display names are stable at this point (registered just above for 'sl'),
	// so they can be copied. Editors are registered later in ui.ts for both 'sl' and 'wysiwyg'.
	wysiwygOverlay.overlayComponents = new Map(singleLineOverlay.overlayComponents);
	wysiwygOverlay.overlayComponentNames = new Map(singleLineOverlay.overlayComponentNames);
	wysiwygOverlay.registerOverlayEditor(WYSIWYGOverlayEditor);
	wysiwygOverlay.perActor = true;
	getApi().registerOverlayType('wysiwyg', 'obs-utils.overlays.wysiwygOverlay.name', wysiwygOverlay);

	const rollOverlay = new OverlayType(PlayerRollOverlay);
	rollOverlay.registerOverlayEditor(PlayerRollOverlayEditor);
	rollOverlay.perActor = false;
	getApi().registerOverlayType('roll', 'obs-utils.overlays.rollOverlay.name', rollOverlay);

	getApi().registerUniqueOverlaySvelte5(PlayerRollOverlay);

	registerBuiltinOBSRemoteEvents();
}

/**
 * Built-in OBS Remote event types are first-class registrations. Third-party
 * modules use the same `registerOBSRemoteEventType` API to plug in their own
 * (system-specific) events like HP threshold, crit/fumble, etc.
 */
function registerBuiltinOBSRemoteEvents() {
	const api = getApi();
	api.registerOBSRemoteEventType({
		key: 'core.onLoad',
		name: 'obs-utils.applications.obsRemote.onLoad',
		icon: 'fas fa-play',
	});
	api.registerOBSRemoteEventType({
		key: 'core.onCombatStart',
		name: 'obs-utils.applications.obsRemote.onCombatStart',
		icon: 'fas fa-swords',
	});
	api.registerOBSRemoteEventType({
		key: 'core.onCombatEnd',
		name: 'obs-utils.applications.obsRemote.onCombatEnd',
		icon: 'fas fa-flag-checkered',
	});
	api.registerOBSRemoteEventType({
		key: 'core.onPause',
		name: 'obs-utils.applications.obsRemote.onPause',
		icon: 'fas fa-pause',
	});
	api.registerOBSRemoteEventType({
		key: 'core.onUnpause',
		name: 'obs-utils.applications.obsRemote.onUnpause',
		icon: 'fas fa-play',
	});
	api.registerOBSRemoteEventType({
		key: 'core.onSceneLoad',
		name: 'obs-utils.applications.obsRemote.onSceneLoad',
		icon: 'fas fa-map',
		conditionFields: [
			{ key: 'sceneName', type: 'string', label: 'obs-utils.applications.obsRemote.vttSceneLabel' },
		],
		// Only fire when the loaded scene's name matches what the user configured.
		matcher: (cond, ctx) => !!cond.sceneName && cond.sceneName === ctx.sceneName,
	});
	api.registerOBSRemoteEventType({
		key: 'core.onStopStreaming',
		name: 'obs-utils.applications.obsRemote.onStopStreaming',
		icon: 'fas fa-signal-stream',
	});
}
