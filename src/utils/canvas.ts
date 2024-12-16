import { getCurrentCombatants } from './combat.js';
import { sleep } from './helpers.js';
import { getSetting } from './settings.ts';

export const VIEWPORT_DATA = new Map();

export function hideApplication(_, html) {
	try {
		html.hide();
	} catch {
		html.style.display = 'none';
	}
}

export function hideTokenBorder(token) {
	if (token?.border?.alpha) {
		token.border.alpha = 0;
	}
}

function getAutoTokens() {
	return game.canvas?.tokens?.ownedTokens;
}

function getPlayerTokens() {
	const playerCharacters = game.users?.players
		.filter(e => (e as User).character != null)
		.map(player => (player as User).character!.id);
	return game.canvas?.tokens?.children
		.flatMap(child => (child.children as Token[]))
		.filter(token => playerCharacters?.includes(token?.actor?.id ?? null))
		.filter(token => token !== undefined);
}

function getManualToken() {
	return game.canvas?.scene?.tokens
		?.filter(token => !!token.getFlag('obs-utils', 'tracked'))
	// @ts-expect-error token.object missing on type
		.map(token => token.object as Token);
}

function toggleToken(tokenDocument) {
	const value = !tokenDocument.getFlag('obs-utils', 'tracked');
	tokenDocument.setFlag('obs-utils', 'tracked', value);
}

export function getCurrentUser() {
	return game.userId;
}

function trackAll() {
	trackTokenList(getAutoTokens() ?? []);
}

function trackTokenList(tokens: Token[]) {
	const coordinates: { x: number;y: number;width: number; height: number }[] = [];

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
	if (game.combat?.started) {
		switch (getSetting('defaultInCombat')) {
			case 'trackall':
				trackAll();
				break;
			case 'trackone':
				trackTokenList([
					getAutoTokens()!.find(
						element => element.id === game.combat?.combatant?.tokenId,
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
	const user = game.users?.get(userId) as User | undefined;
	if (user?.viewedScene !== game?.user?.viewedScene) {
		return;
	}
	if (game.combat?.started) {
		switch (getSetting('defaultInCombat')) {
			case 'cloneDM':
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
	return game.user?.isGM;
}

export function expandTokenHud(_tokenHud, html, token) {
	if (game.user?.isGM) {
		const rightSide = html.find('div.col.right');
		const isTracked = !!token.flags['obs-utils']?.tracked;
		const element = $(
			`<div class="control-icon ${
				isTracked ? 'active' : ''
			}"><i title="Track Token" class="fa-solid fa-signal-stream" /></div>`,
		);
		element.on('click', function () {
			toggleToken(_tokenHud.object.document);
			$(this).toggleClass('active');
		});
		rightSide.append(element);
	}
}

export function scaleToFit() {
	if (
		!(
			(game.combat?.started && getSetting('defaultInCombat') === 'birdseye')
			|| (!game.combat?.started && getSetting('defaultOutOfCombat') === 'birdseye')
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
	ui.sidebar?.element.show();
	ui.sidebar?.tabs.combat?.element.show();
	ui.sidebar?.activateTab('combat');
	ui.sidebar?.element.removeClass('collapsed');
	ui.sidebar?.element.removeAttr('style');
}

export async function hideSidebar() {
	ui.sidebar?.element.hide();
	ui?.sidebar?.collapse();
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
