// These are necessary because Game and Canvas are not always initialized so TypeScript complains

import type { ObsUtilsApi } from './api.ts';
import { flatten } from 'flat';
import { MODULE_ID } from './const.ts';

export function sleep(milliseconds: number | undefined) {
	return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function isOBS() {
	return (
		(!!window.obsstudio
			|| (game as ReadyGame | undefined)?.settings?.get(MODULE_ID, 'obsMode')
			|| (game as ReadyGame | undefined)?.settings?.get(MODULE_ID, 'obsModeUser') === (game as ReadyGame | undefined)?.userId
			|| ((game as ReadyGame | undefined)?.settings?.get(MODULE_ID, 'forceStreamPageOBSMode') && (game as ReadyGame).view === 'stream'))
		&& !(game as ReadyGame | undefined)?.settings?.get(MODULE_ID, 'obsModeGlobalDisable')
	);
}

export function isManualOBS() {
	return (game as ReadyGame | undefined)?.settings?.get(MODULE_ID, 'obsMode');
}

export function removeBG() {
	if (!!window.obsstudio && document.querySelector('body.stream') != null) {
		document.querySelector('body.stream')?.classList.add('transparent-bg');
	}
}

export function getGM(): User | undefined {
	return (game as ReadyGame | undefined)?.users?.find((user: User) => user.isGM && user.active);
}

/** All users with GM permission (online or offline). */
export function getAllGMs(): User[] {
	return (
		(game as ReadyGame | undefined)?.users?.filter((u: User) => u.isGM) ?? []
	) as User[];
}

/**
 * Resolve the GM whose viewport should drive `cloneDM`-mode camera tracking.
 * Honors the `activeGMUserId` setting when that user is online; otherwise
 * falls back to the first active GM (legacy behavior).
 */
export function getActiveGM(): User | undefined {
	const wantedId = (game as ReadyGame | undefined)?.settings?.get('obs-utils', 'activeGMUserId') as string | undefined;
	const users = (game as ReadyGame | undefined)?.users;
	if (wantedId) {
		const u = users?.get(wantedId);
		if (u?.isGM && u?.active) return u as User;
	}
	return users?.find((user: User) => user.isGM && user.active) as User | undefined;
}

export interface ActorValue {
	value: string;
	label: string;
	$created?: boolean;
}

export type ActorValues = ActorValue[];

/**
 * Grouped variant — system modules can ship a richer hierarchical layout via
 * `api.setAVDataGrouped`. Picker components consume the grouped form via
 * `getActorValueGroups` and pass it straight to the picker. Flat data set via
 * legacy `setAVData` is wrapped in a single anonymous group, so the picker only
 * has one code path.
 */
export interface ActorValueGroup {
	/** i18n key for the group label. Resolved at set time. */
	label: string;
	/** Lower numbers sort earlier in the picker. Defaults to 100. */
	order?: number;
	items: ActorValue[];
}

let actorValueGroups: ActorValueGroup[] = [];

function lazyInitFromFoundryActor(): ActorValueGroup[] {
	const type = Object.keys(CONFIG.Actor.sheetClasses).includes('character') ? 'character' : CONFIG.Actor.documentClass.TYPES[1];
	const items = Object.keys(
		flatten(
			JSON.parse(
				JSON.stringify(
					// eslint-disable-next-line new-cap
					new CONFIG.Actor.documentClass({ name: 'actor', type }),
				),
			),
		),
	).map(v => ({ value: v, label: v }));
	return [{ label: '', items }];
}

export function getActorValues(): ActorValues {
	if (actorValueGroups.length === 0) actorValueGroups = lazyInitFromFoundryActor();
	return actorValueGroups.flatMap(g => g.items);
}

/** Returns the grouped layout for picker UIs. Lazy-initializes the same way as `getActorValues`. */
export function getActorValueGroups(): ActorValueGroup[] {
	if (actorValueGroups.length === 0) actorValueGroups = lazyInitFromFoundryActor();
	return actorValueGroups;
}

export function setActorValues(actorValueArray: ActorValues) {
	actorValueGroups = [{ label: '', items: actorValueArray }];
}

/**
 * Return a new groups array that's guaranteed to include `path` as a selectable
 * option. If `path` is already represented, returns the input unchanged.
 * Otherwise appends a "Custom" group (or extends an existing one). Picker UIs
 * use this so a user-typed actor path remains shown in the dropdown.
 */
export function ensureCustomValue(groups: ActorValueGroup[], path: string | null | undefined): ActorValueGroup[] {
	if (!path) return groups;
	const known = groups.flatMap(g => g.items).some(v => v.value === path);
	if (known) return groups;
	const customLabel = game.i18n?.localize('obs-utils.strings.customGroup') ?? 'Custom';
	const existing = groups.find(g => g.label === customLabel);
	if (existing) {
		existing.items.push({ value: path, label: path, $created: true });
		return groups;
	}
	return [...groups, { label: customLabel, items: [{ value: path, label: path, $created: true }] }];
}

/**
 * Install a grouped AV layout. Group labels are localized once at set time.
 * Last writer wins — same semantics as `setActorValues`.
 */
export function setActorValuesGrouped(groups: ActorValueGroup[]) {
	actorValueGroups = [...groups]
		.sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
		.map(g => ({
			label: game.i18n?.localize(g.label) ?? g.label,
			order: g.order,
			items: g.items,
		}));
}

export function getApi(): ObsUtilsApi {
	const moduleData = (game as ReadyGame | undefined)?.modules?.get('obs-utils');
	if (moduleData) return moduleData.api!;
	else throw new Error('Something went very wrong!');
}

export function removeQuotes(s: string) {
	const matched = s.match(
		/^(["'«»‘’‚‛“”„‟‹›])(.*)(?<!\\)["'«»‘’‚‛“”„‟‹›]$/,
	);
	const matched2 = s.match(/^\\(.*)\\(["'«»‘’‚‛“”„‟‹›]?)$/);
	return matched ? matched[2] : matched2 ? matched2[1] + matched2[2] : s;
}

/**
 * Resolve a value from an object by a dot/bracket path.
 * Supports array indices like [0] and for Maps/Objects treats [n] as the nth entry when keys are sorted alphabetically.
 * Returns '' if any step cannot be resolved.
 */
export function getByDataPath(obj: unknown, path: string | undefined | null): unknown {
	if (obj == null || path == null || path === '') return '';
	// Tokenize path into property segments with optional bracket indices
	type Token = { key: string } | { index: number };
	const tokens: Token[] = [];
	let i = 0;
	while (i < path.length) {
		// read key until '.' or '['
		let key = '';
		while (i < path.length && path[i] !== '.' && path[i] !== '[') {
			key += path[i++];
		}
		if (key.length > 0) tokens.push({ key });
		// handle brackets, possibly multiple in a row
		while (i < path.length && path[i] === '[') {
			i++; // skip '['
			let numStr = '';
			while (i < path.length && path[i] !== ']') {
				numStr += path[i++];
			}
			// skip ']'
			if (i < path.length && path[i] === ']') i++;
			const idx = Number.parseInt(numStr, 10);
			if (Number.isNaN(idx) || idx < 0) return '';
			tokens.push({ index: idx });
		}
		// skip '.'
		if (i < path.length && path[i] === '.') i++;
	}

	let current: any = obj as any;
	for (const t of tokens) {
		if ('key' in t) {
			if (current == null) return '';
			if (current instanceof Map) {
				current = current.get(t.key);
			} else {
				current = (current as any)[t.key];
			}
			continue;
		}
		// index token
		if (current == null) return '';
		if (Array.isArray(current)) {
			current = t.index < current.length ? current[t.index] : '';
		} else if (current instanceof Map) {
			const keys = Array.from(current.keys()).sort();
			if (t.index < 0 || t.index >= keys.length) return '';
			const k = keys[t.index];
			current = current.get(k);
		} else if (typeof current === 'object') {
			const keys = Object.keys(current as any).sort();
			if (t.index < 0 || t.index >= keys.length) return '';
			const k = keys[t.index];
			current = (current as any)[k];
		} else {
			return '';
		}
	}
	return current === undefined ? '' : current;
}

/**
 * Like getByDataPath, but paths prefixed with `trigger.` are resolved against
 * the event payload instead of the actor. Returns '' if the payload is absent
 * or the path cannot be resolved.
 */
export function getByTriggerOrDataPath(actor: unknown, payload: Record<string, any> | undefined, path: string | undefined | null): unknown {
	if (path?.startsWith('trigger.')) {
		if (payload == null) return '';
		return getByDataPath(payload, path.slice('trigger.'.length));
	}
	return getByDataPath(actor, path);
}

/**
 * Minimal debounce implementation with optional maxWait.
 */
export function debounce<F extends (...args: any[]) => void>(fn: F, wait = 0, options?: { maxWait?: number }) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastInvoke = 0;
	let pendingArgs: any[] | null = null;
	const maxWait = options?.maxWait;

	function invoke(context: any) {
		lastInvoke = Date.now();
		const args = pendingArgs;
		pendingArgs = null;
		fn.apply(context, args ?? []);
	}

	function debounced(this: any, ...args: any[]) {
		pendingArgs = args;
		const now = Date.now();
		if (maxWait && now - lastInvoke >= maxWait) {
			if (timer) clearTimeout(timer);
			invoke(this);
			return;
		}
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			invoke(this);
		}, wait);
	}

	return debounced as F;
}

export function preventUndefinedNullInArray(array: any | null | undefined[]): any[] {
	return array.filter((v: any | null | undefined) => v !== undefined && v !== null);
}
