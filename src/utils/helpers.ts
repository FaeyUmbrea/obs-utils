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

function getFontAwesomeVersion() {
	const version = Number.parseInt((game as ReadyGame).version!.split('.')[1]!);
	if (version <= 290) {
		return '6.1.0';
	}
	return '6.2.0';
}

export async function getFontawesomeVariables() {
	const response = await fetch('https://api.fontawesome.com', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
		},
		mode: 'cors',
		body: `query {release(version:"${getFontAwesomeVersion()}") {icons {id familyStylesByLicense{pro{family style}}}}}`,
	});

	const json = await response.json();
	const icons = json.data.release.icons;

	return icons
		.map((value: { familyStylesByLicense: { pro: { family: string; style: string }[] }; id: string }) => {
			return value.familyStylesByLicense.pro.map((family: { family: string; style: string }) => {
				return (
					`fa-${family.family} fa-${family.style} fa-${value.id}`
				);
			});
		})
		.flat();
}

export type ActorValues = string[] | { value: string; label: string }[] | undefined;

let actorValues: ActorValues;

export function getActorValues() {
	if (!actorValues) {
		const type = Object.keys(CONFIG.Actor.sheetClasses).includes('character') ? 'character' : CONFIG.Actor.documentClass.TYPES[1];
		actorValues = Object.keys(
			flatten(
				JSON.parse(
					JSON.stringify(
						// eslint-disable-next-line new-cap
						new CONFIG.Actor.documentClass({
							name: 'actor',
							type,
						}),
					),
				),
			),
		).map((v) => { return { value: v, label: v }; });
	}
	return actorValues;
}

export function setActorValues(actorValueArray: ActorValues) {
	actorValues = actorValueArray;
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
