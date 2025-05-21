import type { TokenDocument, TokenHUD } from '@league-of-foundry-developers/foundry-vtt-types/configuration';

import { getCurrentCombatants } from './combat.ts';
import { sleep } from './helpers.js';
import { getSetting } from './settings.ts';

export const VIEWPORT_DATA = new Map();

export function hideApplication(_, html: JQuery<HTMLElement> | HTMLElement) {
	try {
		(html as JQuery).hide();
	} catch {
		(html as HTMLElement).style.display = 'none';
	}
}

export function hideNotifications() {
	const panel = document.querySelector('div#chat-notifications');
	if (panel) {
		(panel as HTMLElement).style.display = 'none';
	}

	const buttons = document.querySelector('nav.tabs');
	if (buttons) {
		(buttons as HTMLElement).style.display = 'none';
	}
}

export function hideTokenBorder(token) {
	if (token?.border?.alpha) {
		token.border.alpha = 0;
	}
}

function getAutoTokens() {
	return (game as ReadyGame).canvas?.tokens?.ownedTokens;
}

function getPlayerTokens() {
	// @ts-expect-error mixins dont work
	const playerCharacters = (game as ReadyGame).users?.players.filter(e => (e as User).character != null).map(player => (player as User).character!.id);
	// @ts-expect-error mixins dont work
	return (game as ReadyGame).canvas?.tokens?.children.flatMap(child => (child.children as Token[])).filter(token => playerCharacters?.includes(token?.actor?.id ?? null)).filter(token => token !== undefined);
}

function getManualToken() {
	// @ts-expect-error mixins dont work
	return (game as ReadyGame).canvas?.scene?.tokens?.filter(token => !!token.getFlag('obs-utils', 'tracked')).map(token => token.object as Token);
}

function toggleToken(tokenDocument) {
	const value = !tokenDocument.getFlag('obs-utils', 'tracked');
	tokenDocument.setFlag('obs-utils', 'tracked', value);
}

export function getCurrentUser() {
	return (game as ReadyGame).userId;
}

function trackAll() {
	trackTokenList(getAutoTokens() ?? []);
}

function trackTokenList(tokens: Token[]) {
	const coordinates: { x: number; y: number; width: number; height: number }[] = [];

	tokens?.forEach((token) => {
		const object = {
			x: token?.document._source.x,
			y: token?.document._source.y,
			width: token?.w,
			height: token?.h,
		};
		coordinates.push(object);
	});

	const bounds = calculateBoundsOfCoodinates(coordinates);

	if (!bounds) return;

	const screenDimensions = canvas!.screenDimensions;

	const scaleX = screenDimensions[0] / (bounds.maxX - bounds.minX + 300);
	const scaleY = screenDimensions[1] / (bounds.maxY - bounds.minY + 300);

	let scale = Math.min(scaleX, scaleY);
	scale = Math.min(scale, getSetting('maxScale')!);
	scale = Math.max(scale, getSetting('minScale')!);

	clampAndApply({ x: bounds.center.x, y: bounds.center.y, scale });
}

export function tokenMoved() {
	// @ts-expect-error mixins dont work
	if ((game as ReadyGame).combat?.started) {
		switch (getSetting('defaultInCombat')) {
			case 'trackall':
				trackAll();
				break;
			case 'trackone':
				trackTokenList([
					getAutoTokens()!.find(
						// @ts-expect-error mixins dont work
						element => element.id === (game as ReadyGame).combat?.combatant?.tokenId,
					)!,
				]);
				break;
			case 'trackPlayerOwned':
				trackTokenList(getPlayerTokens() ?? []);
				break;
			default:
				break;
		}
	} else {
		switch (getSetting('defaultOutOfCombat')) {
			case 'trackall':
				trackAll();
				break;
			case 'trackmanual':
				trackTokenList(getManualToken() ?? []);
				break;
			case 'trackPlayerOwned':
				trackTokenList(getPlayerTokens() ?? []);
				break;
			default:
				break;
		}
	}
}

function calculateBoundsOfCoodinates(coordSet) {
	let minX, maxX, minY, maxY;
	maxX = maxY = Number.MIN_VALUE;
	minX = minY = Number.MAX_VALUE;

	coordSet.forEach((coords) => {
		minX = Math.min(minX, coords.x);
		minY = Math.min(minY, coords.y);
		maxX = Math.max(maxX, coords.x + coords.width);
		maxY = Math.max(maxY, coords.y + coords.height);
	});
	if (
		(minX === minY && minX === Number.MAX_VALUE)
		|| (maxX === maxY && maxX === Number.MIN_VALUE)
	) {
		return undefined;
	}
	return {
		minX,
		minY,
		maxX,
		maxY,
		center: { x: minX + (maxX - minX) / 2, y: minY + (maxY - minY) / 2 },
	};
}

export function viewportChanged(userId) {
	const user = (game as ReadyGame).users?.get(userId) as User | undefined;
	// @ts-expect-error mixins dont work
	if (user?.viewedScene !== (game as ReadyGame | undefined)?.user?.viewedScene) {
		return;
	}
	// @ts-expect-error mixins dont work
	if ((game as ReadyGame).combat?.started) {
		switch (getSetting('defaultInCombat')) {
			case 'cloneDM':
				// @ts-expect-error mixins dont work
				if (user?.isGM)
					clampAndApply(VIEWPORT_DATA.get(userId));
				break;
			case 'cloneTurnPlayer':
				if (getCurrentCombatants()?.some(e => e.id === userId))
					clampAndApply(VIEWPORT_DATA.get(userId));
				break;
			case 'clonePlayer':
				if (userId === getSetting('trackedUser'))
					clampAndApply(VIEWPORT_DATA.get(userId));
				break;
			default:
				break;
		}
	} else {
		switch (getSetting('defaultOutOfCombat')) {
			case 'cloneDM':
				// @ts-expect-error mixins dont work
				if (user?.isGM)
					clampAndApply(VIEWPORT_DATA.get(userId));
				break;
			case 'clonePlayer':
				if (userId === getSetting('trackedUser'))
					clampAndApply(VIEWPORT_DATA.get(userId));
				break;
			default:
				break;
		}
	}
}

export function isGM() {
	// @ts-expect-error mixins dont work
	return (game as ReadyGame).user?.isGM;
}

export function expandTokenHud(_tokenHud: TokenHUD, html: HTMLFormElement, token: TokenDocument) {
	// @ts-expect-error mixins dont work
	if ((game as ReadyGame).user?.isGM) {
		const rightSide = html.querySelector('div.col.right');
		if (!rightSide) return;
		// @ts-expect-error mixins dont work
		const isTracked = !!token.flags['obs-utils']?.tracked;
		const element = $(
			`<button type="button" class="control-icon ${
				isTracked ? 'active' : ''
			}"><i class="fa-solid fa-signal-stream" /></button>`,
		);
		element.on('click', function () {
			toggleToken(_tokenHud.object.document);
			$(this).toggleClass('active');
		});
		element.appendTo(rightSide);
	}
}

export function scaleToFit() {
	if (
		!(
		// @ts-expect-error mixins dont work
			((game as ReadyGame).combat?.started && getSetting('defaultInCombat') === 'birdseye')
			// @ts-expect-error mixins dont work
			|| (!(game as ReadyGame).combat?.started && getSetting('defaultOutOfCombat') === 'birdseye')
		)
	) {
		return;
	}
	const screenDimensions = canvas!.screenDimensions;
	const sceneDimensions = canvas!.scene!.dimensions;

	const center = {
		x: sceneDimensions.width / 2,
		y: sceneDimensions.height / 2,
	};
	const scale = Math.min(
		screenDimensions[0] / sceneDimensions.width,
		screenDimensions[1] / sceneDimensions.height,
	);

	clampAndApply({ ...center, scale });
}

export async function closePopupWithDelay(popout) {
	const delay = getSetting('popupCloseDelay')!;
	if (delay > 0) {
		await sleep(delay * 1000);
		popout.close();
	}
}

export async function applyPopupConstrains(popout: Application) {
	if (getSetting('fixedPopups')) {
		const position = {
			left: getSetting('fixedPopupX')!,
			top: getSetting('fixedPopupY')!,
			width: getSetting('fixedPopupWidth')!,
			height: getSetting('fixedPopupHeight')!,
		};
		popout.setPosition(position);
	}
}

export async function showTracker() {
	if (!getSetting('showTrackerInCombat')) return;
	ui.sidebar.element.removeAttribute('style');
	ui.sidebar.expand();
	ui.sidebar.changeTab('combat', 'primary');
}

export async function hideSidebar() {
	(ui.sidebar?.element as HTMLElement).style.display = 'none';
}

export async function screenReload() {
	scaleToFit();
	tokenMoved();
}

function clamp(canvasPos: { x: any; y: any; scale: any }) {
	const screenDimensions = canvas!.screenDimensions;
	const sceneDimensions = canvas!.scene!.dimensions!;
	let { x, y, scale } = canvasPos;

	const minScale = Math.max(
		screenDimensions[0] / sceneDimensions.width,
		screenDimensions[1] / sceneDimensions.height,
	);
	scale = Math.max(minScale, scale);

	const offsetX
    = (sceneDimensions.width * scale - screenDimensions[0]) / scale / 2;
	const offsetY
    = (sceneDimensions.height * scale - screenDimensions[1]) / scale / 2;
	const centerX = sceneDimensions.width / 2;
	const centerY = sceneDimensions.height / 2;

	x = Math.min(centerX + offsetX, Math.max(centerX - offsetX, x));
	y = Math.min(centerY + offsetY, Math.max(centerY - offsetY, y));

	return { x, y, scale };
}

function clampAndApply(canvasPos: { x: any; y: any; scale: any }) {
	if (getSetting('clampCanvas')) {
		canvasPos = clamp(canvasPos);
	}
	canvas!.animatePan(canvasPos).then();
}
