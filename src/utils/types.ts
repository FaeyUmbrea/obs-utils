import type { StringMap } from './const.ts';
import { OBSAction } from './settings.ts';

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
	id?: string;
	customCSS?: string;

	constructor(type = 'sl', components = [], style = '', config: Record<string, any> = {}, name?: string, enabled?: boolean) {
		this.type = type;
		this.components = components;
		this.style = style;
		this.config = config;
		this.name = name;
		this.enabled = enabled;
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
