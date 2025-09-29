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
