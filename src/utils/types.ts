import type { StringMap } from './const.ts';
import { OBSAction } from './settings.ts';

/**
 * One field in a trigger's payload schema. Drives both the editor's condition
 * inputs (when filter !== false) and the value paths components can reference
 * via `trigger.X` (when display !== false).
 */
export interface TriggerPayloadField {
	/** Storage / lookup key. */
	key: string;
	type: 'number' | 'string' | 'boolean' | 'Actor' | 'ChatMessage' | 'Roll';
	/** i18n key for the label. Resolved via game.i18n.localize() at render time. */
	label: string;
	/** Default value used when the editor seeds a fresh condition. */
	default?: any;
	/** If false, this field cannot be referenced via trigger.<key>. Defaults to true. */
	display?: boolean;
	/** If false, this field is not exposed to the editor condition inputs. Defaults to true. */
	filter?: boolean;
}

/**
 * Per-overlay trigger configuration written into OverlayData.trigger when the
 * layer should be event-driven instead of always-on.
 */
export interface OverlayTriggerConfig {
	eventKey: string;
	conditions: Record<string, any>;
	/** Total visible time in ms after the trigger fires (including show/hide). -1 = sticky until next fire. */
	duration: number;
	/** Entrance animation duration in ms. */
	showMs: number;
	/** Exit animation duration in ms. */
	hideMs: number;
	transition: 'fade' | 'slide-up' | 'slide-down' | 'scale' | 'flash';
}

export class OBSEvent {
	targetAction = OBSAction.SwitchScene;
	sceneName = '';
	targetName = '';
}

export class OBSWebsocketSettings {
	url = 'localhost';
	port = '4455';
	password = '';
}

export class SceneLoadEvent {
	sceneName = '';
	obsActions = [];
}

/**
 * One configured firing of a registered OBS Remote event type — the per-instance
 * condition values the user filled in (matched against context at fire time)
 * plus the OBS actions to run when the matcher passes.
 */
export interface CustomEventInstance {
	conditions: Record<string, any>;
	actions: OBSEvent[];
}

export class OBSRemoteSettings implements StringMap {
	[key: string]: any;
	/** Legacy fields — retained for read-side migration only, no longer the source of truth. */
	onLoad: OBSEvent[] = [];
	onCombatStart: OBSEvent[] = [];
	onCombatEnd: OBSEvent[] = [];
	onPause: OBSEvent[] = [];
	onUnpause: OBSEvent[] = [];
	onSceneLoad: SceneLoadEvent[] = [];
	onStopStreaming: OBSEvent[] = [];

	/**
	 * Registry-driven storage. Keyed by the event type's registration key
	 * (e.g. 'core.onCombatStart', 'dnd5e.hpThreshold'). Both built-in event
	 * types (registered by obs-utils itself) and third-party module types
	 * share this map.
	 */
	customEvents: Record<string, CustomEventInstance[]> = {};
}

export function generateId(): string {
	if (typeof globalThis !== 'undefined' && (globalThis as any).foundry?.utils?.randomID) {
		return (globalThis as any).foundry.utils.randomID();
	}
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class OverlayData {
	type: string;
	components: OverlayComponentData[];
	style: string;
	config: Record<string, any>;
	name?: string;
	enabled?: boolean;
	trigger?: OverlayTriggerConfig;
	id?: string;
	customCSS?: string;

	constructor(type = 'sl', components = [], style = '', config: Record<string, any> = {}, name?: string, enabled?: boolean, trigger?: OverlayTriggerConfig) {
		this.type = type;
		this.components = components;
		this.style = style;
		this.config = config;
		this.name = name;
		this.enabled = enabled;
		this.trigger = trigger;
		this.id = generateId();
	}
}

export class OverlayComponentData {
	type: string;
	data: string;
	style: string;
	x?: number;
	y?: number;
	w?: number;
	h?: number;
	rotation?: number;
	locked?: boolean;
	id?: string;
	customCSS?: string;

	constructor(type = 'pt', data = '', style = '') {
		this.type = type;
		this.data = data;
		this.style = style;
		this.id = generateId();
	}
}

export function ensureOverlayId(o: OverlayData): string {
	if (!o.id) o.id = generateId();
	return o.id;
}

export function ensureComponentId(c: OverlayComponentData): string {
	if (!c.id) c.id = generateId();
	return c.id;
}
