import type { Component } from 'svelte';
import type { CameraPreset } from './cameraPresets.ts';
import type { SequenceController } from './cameraSequencePlayer.ts';
import type { LegacyRollOverlayConfig } from './defaultOverlays.ts';
import type { DirectorState } from './directorState.ts';
import type { ActorValueGroup, ActorValues } from './helpers.ts';
import type { CustomEventInstance, OverlayData, TriggerPayloadField } from './types.ts';
import FallbackEditor from '../svelte/components/editors/FallbackEditor.svelte';
import WYSIWYGOverlayEditor from '../svelte/components/editors/WYSIWYGOverlayEditor.svelte';
import ActorValComponent from '../svelte/streamoverlays/overlaycomponents/ActorValComponent.svelte';
import AVBoolIconComponent from '../svelte/streamoverlays/overlaycomponents/AVBoolIconComponent.svelte';
import AVBoolImageComponent from '../svelte/streamoverlays/overlaycomponents/AVBoolImageComponent.svelte';
import AVImageDisplayComponent from '../svelte/streamoverlays/overlaycomponents/AVImageDisplayComponent.svelte';
import AVMultiIconComponent from '../svelte/streamoverlays/overlaycomponents/AVMultiIconComponent.svelte';
import AVMultiImageComponent from '../svelte/streamoverlays/overlaycomponents/AVMultiImageComponent.svelte';
import FAIconComponent from '../svelte/streamoverlays/overlaycomponents/FAIconComponent.svelte';
import ProgressBarComponent from '../svelte/streamoverlays/overlaycomponents/ProgressBarComponent.svelte';
import SingleLineOverlay from '../svelte/streamoverlays/SingleLineOverlay.svelte';
import WYSIWYGOverlay from '../svelte/streamoverlays/WYSIWYGOverlay.svelte';
import { playSequence } from './cameraSequencePlayer.ts';
import { MODULE_ID } from './const.ts';
import { makeRollOverlayFromLegacyConfig, registerStarter } from './defaultOverlays.ts';
import { getDirectorState as readDirectorState } from './directorState.ts';
import { getApi, isOBS, setActorValues, setActorValuesGrouped } from './helpers.ts';
import { getWebsocket } from './obs.ts';

import { getSetting, setSetting } from './settings.ts';

import { orchestratePresetPlay } from './socket.ts';

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

export interface OverlayTriggerRegistration {
	/** Unique key — namespace with your module id (e.g. 'dnd5e.spellCast'). */
	key: string;
	/**
	 * i18n key for the display name. Resolved via `game.i18n.localize()` at
	 * render time. Pass a literal string only if you intentionally ship a
	 * single-locale module — the UI will display it verbatim.
	 */
	name: string;
	/** Optional Font Awesome icon class (e.g. 'fas fa-dice-d20'). */
	icon?: string;
	/** Fields carried in the event payload — drives editor condition inputs and trigger.X references. */
	payloadSchema?: TriggerPayloadField[];
}

export interface DirectorTabRegistration {
	/** Unique key — namespace with your module id (e.g. 'my-module.weatherTab'). */
	key: string;
	/** i18n key for the tab button label. */
	label: string;
	/** Optional Font Awesome icon class for the tab button. */
	icon?: string;
	/** Svelte component rendered when this tab is active. Receives `{ disabled }` prop. */
	component: Component;
	/** Sort order. Built-ins use 10/20/30; default for module tabs is 100 (placed after built-ins). */
	order?: number;
}

/**
 * Cross-bundle-safe Director tab. Instead of a component, you pass a `mount` callback that mounts the tab
 * with *your own* module's Svelte `mount()`. A Svelte 5 component from another bundle cannot be mounted by
 * OBS Utils' runtime — its runes resolve against your bundle's effect context, so OBS Utils mounting it
 * throws `effect_orphan`. Letting your module mount it fixes that. (A Svelte 4 module can `new Component()`
 * inside the same callback.)
 */
export interface DirectorTabSvelte5Registration {
	key: string;
	label: string;
	icon?: string;
	/**
	 * Mount the tab UI into `target` (e.g. `mount(MyTab, { target, props })`) and return a cleanup
	 *  function that tears it down (e.g. `() => unmount(app)`).
	 */
	mount: (target: HTMLElement, props: { disabled: boolean }) => (() => void);
	order?: number;
}

export class ObsUtilsApi {
	overlayTypes: Map<string, OverlayType>;
	overlayTypeNames: Map<string, string>;
	singleInstanceOverlays: Set<Component>;
	singleInstanceOverlaysSvelte5: Set<(target: HTMLElement) => (() => void)>;
	obsRemoteEventTypes: Map<string, OBSRemoteEventTypeRegistration>;
	overlayTriggers: Map<string, OverlayTriggerRegistration>;
	directorTabs: Map<string, DirectorTabRegistration | DirectorTabSvelte5Registration>;

	constructor() {
		this.overlayTypes = new Map();
		this.overlayTypeNames = new Map();
		this.singleInstanceOverlays = new Set();
		this.singleInstanceOverlaysSvelte5 = new Set();
		this.obsRemoteEventTypes = new Map();
		this.overlayTriggers = new Map();
		this.directorTabs = new Map();
	}

	/** Public — modules call this in their init hook to expose a new event type. */
	registerOBSRemoteEventType(reg: OBSRemoteEventTypeRegistration) {
		this.obsRemoteEventTypes.set(reg.key, reg);
	}

	/** Public — modules call this to expose a new overlay trigger type. */
	registerOverlayTrigger(reg: OverlayTriggerRegistration) {
		this.overlayTriggers.set(reg.key, reg);
	}

	/**
	 * Public — register a tab in the Director window.
	 * @deprecated A Svelte 5 component from another module fails to mount here (`effect_orphan`). Use
	 *   {@link registerDirectorTabSvelte5}, which lets your module mount its own UI. Still fine for
	 *   OBS Utils' own (same-bundle) tabs.
	 */
	registerDirectorTab(reg: DirectorTabRegistration) {
		this.directorTabs.set(reg.key, reg);
	}

	/** Public — register a Director tab whose UI your module mounts itself (cross-bundle-safe). */
	registerDirectorTabSvelte5(reg: DirectorTabSvelte5Registration) {
		this.directorTabs.set(reg.key, reg);
	}

	/**
	 * Public — snapshot of Director state (tracking modes, combat, focused user).
	 * Subscribe to `obs-utils.director.stateChanged` to react to changes; the
	 * hook payload is `(next: DirectorState, prev: DirectorState | undefined)`.
	 */
	getDirectorState(): DirectorState {
		return readDirectorState();
	}

	/** Public — set one of the tracking-mode slots. Mirrors the Controls tab UI. */
	async setTrackingMode(slot: 'inCombat' | 'outOfCombat', mode: string) {
		const key = slot === 'inCombat' ? 'defaultInCombat' : 'defaultOutOfCombat';
		await setSetting(key as any, mode as any);
	}

	/**
	 * Public — modules call this when their in-system event fires (e.g. a chat
	 * message is created, a roll is made). Dispatches via Foundry's Hooks bus
	 * so any number of overlay renderers can react without tight coupling.
	 */
	fireOverlayTrigger(key: string, payload: Record<string, any>) {
		// Cast required — fvtt-types only knows built-in hook names.
		(Hooks.callAll as (hook: string, ...args: any[]) => boolean)('obs-utils.overlayTrigger', key, payload);
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

	/**
	 * Register a new overlay type. Surfaces in the Stream Composer's "+ new"
	 * menu and elsewhere the type list is consumed.
	 *
	 * @param key Stable key written into `OverlayData.type` (e.g. 'wysiwyg').
	 * @param readableName i18n key for the display label. Resolved via
	 *   `game.i18n.localize()` at render time. Pass a literal string only if
	 *   you intentionally ship a single-locale module.
	 * @param type The OverlayType instance with the renderer and editor wired up.
	 */
	registerOverlayType(key: string, readableName: string, type: OverlayType) {
		this.overlayTypes.set(key, type);
		this.overlayTypeNames.set(key, readableName);
	}

	/**
	 * Build a `wysiwyg` (canvas) overlay that emulates the 4.x roll overlay.
	 * Shared by the v4 migration (5.0 `type: 'roll'` entries) and the docs
	 * snippet that pulls the user's legacy flat settings out of the world.
	 *
	 * The returned overlay is a 250×250 layer with `tileBy: 'players'`, a
	 * `core.onPlayerRoll` transition out of the idle track, and the pre /
	 * roll / post phases chained through `transition-on-end`.
	 *
	 * Push the result into `streamOverlays` (or import it through the
	 * composer) — this helper is data-only and does not touch settings.
	 */
	buildLegacyRollOverlayCanvas(config: LegacyRollOverlayConfig): OverlayData {
		return makeRollOverlayFromLegacyConfig(config);
	}

	// Legacy external component workflow (pre-Svelte 5)
	registerUniqueOverlay(overlay: Component) {
		this.singleInstanceOverlays.add(overlay);
	}

	/**
	 * Register a unique overlay rendered once on the stream, for Svelte 5 modules. Pass a `mount` callback
	 * that mounts your overlay into the given element with your own module's Svelte `mount()` and returns a
	 * cleanup function — OBS Utils can't mount a Svelte 5 component from another bundle itself (effect_orphan).
	 */
	registerUniqueOverlaySvelte5(mount: (target: HTMLElement) => (() => void)) {
		this.singleInstanceOverlaysSvelte5.add(mount);
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

	/**
	 * Public — system modules call this with a hierarchical layout. The picker
	 * UI renders groups in the dropdown. Group labels are i18n keys, localized
	 * at flatten time. Calling this replaces any previously-set AV data
	 * (grouped or flat) — last writer wins, same as `setAVData`.
	 */
	setAVDataGrouped(groups: ActorValueGroup[]) {
		setActorValuesGrouped(groups);
	}

	/**
	 * Public — system modules call this in their init hook to register their
	 * own starter overlay set. The burger menu in the overlay editor imports
	 * whichever set is registered (or the generic default if none). Last writer
	 * wins.
	 */
	registerStarterOverlays(overlays: OverlayData[]): void {
		registerStarter(overlays);
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

	/**
	 * Public — play a camera preset on the OBS client. The DM that calls this
	 * claims active-GM control, swaps the current tracking mode to cloneDM,
	 * pauses their outgoing viewport stream, and broadcasts the preset so it
	 * runs locally on every OBS client. The DM's own view does not move.
	 *
	 * For previewing a preset in the editor (no broadcast, no state changes),
	 * call `playSequence` directly from `cameraSequencePlayer`.
	 */
	playPreset(preset: CameraPreset): void {
		void orchestratePresetPlay(preset);
	}

	/**
	 * Local-only preview play. Use this from the preset editor when scrubbing
	 * or auditioning — doesn't touch tracking state and doesn't broadcast.
	 */
	previewPreset(preset: CameraPreset): SequenceController {
		return playSequence(preset);
	}
}

export interface ImageSlotHandlers {
	/** Extract all image-ref strings from a component's data field. */
	extract: (data: string) => string[];
	/** Rewrite all image refs in data using the path-map. Return the new data string. */
	rewrite: (data: string, pathMap: ReadonlyMap<string, string>) => string;
}

export class OverlayType {
	overlayEditor: Component;
	overlayComponents: Map<string, Component<any, any, any>>;
	overlayClass: Component;
	overlayComponentNames: Map<string, string>;
	overlayComponentEditors: Map<string, Component<any, any, any>>;
	compactEditorButtons: Map<string, boolean>;
	overlayComponentImageSlots: Map<string, ImageSlotHandlers>;
	hasCustomOverlayEditor: boolean = false;
	perActor: boolean = true;

	constructor(overlayClass: Component<any, any, any>) {
		this.overlayComponents = new Map();
		this.overlayClass = overlayClass;
		this.overlayComponentNames = new Map();
		this.overlayComponentEditors = new Map();
		this.compactEditorButtons = new Map();
		this.overlayComponentImageSlots = new Map();
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

	registerComponentImageSlots(key: string, handlers: ImageSlotHandlers) {
		this.overlayComponentImageSlots.set(key, handlers);
	}
}

export function registerDefaultTypes() {
	const singleLineOverlay = new OverlayType(SingleLineOverlay);
	const builtinComponents: Array<[key: string, nameKey: string, component: Component<any>]> = [
		['pt', 'obs-utils.overlays.plainText.name', ActorValComponent],
		['fai', 'obs-utils.overlays.fontAwesomeIcon.name', FAIconComponent],
		['bav', 'obs-utils.overlays.booleanAVIcon.name', AVBoolIconComponent],
		['bavimg', 'obs-utils.overlays.booleanAVImage.name', AVBoolImageComponent],
		['img', 'obs-utils.overlays.image.name', AVImageDisplayComponent],
		['micoav', 'obs-utils.overlays.multiIconAV.name', AVMultiIconComponent],
		['mimgav', 'obs-utils.overlays.multiImageAV.name', AVMultiImageComponent],
		['pb', 'obs-utils.overlays.progressBar.name', ProgressBarComponent],
	];
	for (const [key, nameKey, component] of builtinComponents) {
		singleLineOverlay.registerComponent(key, nameKey, component);
	}

	// img: data IS the path
	singleLineOverlay.registerComponentImageSlots('img', {
		extract: d => (d ? [d] : []),
		rewrite: (d, m) => m.get(d) ?? d,
	});

	// bavimg: "avPath;trueImg;falseImg" — slots 1 and 2 carry images
	singleLineOverlay.registerComponentImageSlots('bavimg', {
		extract: (d) => {
			const parts = d.split(';');
			return [parts[1], parts[2]].filter(p => p && p.length > 0);
		},
		rewrite: (d, m) => {
			const parts = d.split(';');
			if (parts[1]) parts[1] = m.get(parts[1]) ?? parts[1];
			if (parts[2]) parts[2] = m.get(parts[2]) ?? parts[2];
			return parts.join(';');
		},
	});

	// mimgav: "valuePath;filledImg;maxPath;emptyImg" — slots 1 and 3 carry images
	singleLineOverlay.registerComponentImageSlots('mimgav', {
		extract: (d) => {
			const parts = d.split(';');
			return [parts[1], parts[3]].filter(p => p && p.length > 0);
		},
		rewrite: (d, m) => {
			const parts = d.split(';');
			if (parts[1]) parts[1] = m.get(parts[1]) ?? parts[1];
			if (parts[3]) parts[3] = m.get(parts[3]) ?? parts[3];
			return parts.join(';');
		},
	});

	// Register Legacy Names
	const legacyNames: Array<[name: string, component: Component<any>]> = [
		['Plain Text', ActorValComponent],
		['Font Awesome Icon', FAIconComponent],
		['Actor Value', ActorValComponent],
		['Boolean Actor Value', AVBoolIconComponent],
		['iav', AVImageDisplayComponent],
		['av', ActorValComponent],
	];
	for (const [name, component] of legacyNames) singleLineOverlay.overlayComponents.set(name, component);

	getApi().registerOverlayType('sl', 'obs-utils.overlays.simpleOverlay.name', singleLineOverlay);
	getApi().overlayTypes.set('Single Line', singleLineOverlay);

	const wysiwygOverlay = new OverlayType(WYSIWYGOverlay);
	// Component renderers + display names are stable at this point (registered just above for 'sl'),
	// so they can be copied. Editors are registered later in ui.ts for both 'sl' and 'wysiwyg'.
	wysiwygOverlay.overlayComponents = new Map(singleLineOverlay.overlayComponents);
	wysiwygOverlay.overlayComponentNames = new Map(singleLineOverlay.overlayComponentNames);
	wysiwygOverlay.overlayComponentImageSlots = new Map(singleLineOverlay.overlayComponentImageSlots);
	wysiwygOverlay.registerOverlayEditor(WYSIWYGOverlayEditor);
	wysiwygOverlay.perActor = true;
	getApi().registerOverlayType('wysiwyg', 'obs-utils.overlays.wysiwygOverlay.name', wysiwygOverlay);

	registerBuiltinOBSRemoteEvents();
	registerBuiltinOverlayTriggers();
	registerBuiltinDirectorTabs();
}

async function registerBuiltinDirectorTabs() {
	const [{ default: ControlsTab }, { default: PresetsTab }, { default: CoDMsTab }] = await Promise.all([
		import('../svelte/components/director/ControlsTab.svelte'),
		import('../svelte/components/director/PresetsTab.svelte'),
		import('../svelte/components/director/CoDMsTab.svelte'),
	]);
	const builtinTabs: DirectorTabRegistration[] = [
		{ key: 'core.controls', label: 'obs-utils.applications.director.tabControls', icon: 'fas fa-video', component: ControlsTab, order: 10 },
		{ key: 'core.presets', label: 'obs-utils.applications.director.tabPresets', icon: 'fas fa-bookmark', component: PresetsTab, order: 20 },
		{ key: 'core.codms', label: 'obs-utils.applications.director.tabCoDMs', icon: 'fas fa-users', component: CoDMsTab, order: 30 },
	];
	const api = getApi();
	for (const tab of builtinTabs) api.registerDirectorTab(tab);
}

function registerBuiltinOverlayTriggers() {
	const api = getApi();
	api.registerOverlayTrigger({
		key: 'core.onPlayerRoll',
		name: 'obs-utils.triggers.core.onPlayerRoll.name',
		icon: 'fas fa-dice-d20',
		payloadSchema: [
			{ key: 'actor', type: 'Actor', label: 'obs-utils.triggers.core.onPlayerRoll.fields.actor', display: true, filter: true },
			{ key: 'roll', type: 'Roll', label: 'obs-utils.triggers.core.onPlayerRoll.fields.roll', display: true, filter: false },
			{ key: 'total', type: 'number', label: 'obs-utils.triggers.core.onPlayerRoll.fields.total', display: true, filter: true },
			{ key: 'formula', type: 'string', label: 'obs-utils.triggers.core.onPlayerRoll.fields.formula', display: true, filter: true },
			{ key: 'isCritical', type: 'boolean', label: 'obs-utils.triggers.core.onPlayerRoll.fields.isCritical', display: true, filter: true },
			{ key: 'isFumble', type: 'boolean', label: 'obs-utils.triggers.core.onPlayerRoll.fields.isFumble', display: true, filter: true },
		],
	});
	api.registerOverlayTrigger({
		key: 'core.onChatMessage',
		name: 'obs-utils.triggers.core.onChatMessage.name',
		icon: 'fas fa-comment',
		payloadSchema: [
			{ key: 'message', type: 'ChatMessage', label: 'obs-utils.triggers.core.onChatMessage.fields.message', display: true, filter: false },
			{ key: 'content', type: 'string', label: 'obs-utils.triggers.core.onChatMessage.fields.content', display: true, filter: true },
			{ key: 'speakerAlias', type: 'string', label: 'obs-utils.triggers.core.onChatMessage.fields.speakerAlias', display: true, filter: true },
		],
	});
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
