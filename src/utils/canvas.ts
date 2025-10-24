import { getCurrentCombatants } from './combat.ts';
import { isOBS, sleep } from './helpers.js';
import { getSetting } from './settings.ts';

export const VIEWPORT_DATA: Map<string, { x: number; y: number; scale: number }> = new Map();

export function hideApplication(_: unknown, html: JQuery | HTMLElement) {
	try {
		(html as JQuery).hide();
	} catch {
		(html as HTMLElement).style.display = 'none';
	}
}

export function hideSceneControls(_: unknown, html: JQuery | HTMLElement) {
	if (!isOBS() || !getSetting('showDirectorInOBSMode')) {
		return hideApplication(_, html);
	}
	const root = html as HTMLElement;
	const layersMenu = root.querySelector('menu#scene-controls-layers');
	if (!layersMenu) return hideApplication(_, html);
	Array.from(layersMenu.children).forEach((item) => {
		const button = item.children[0] as HTMLElement | undefined;
		if (!button) return;
		if (button.ariaLabel === 'Token Controls') {
			button.click();
		} else {
			button.style.display = 'none';
		}
	});
	const toolsMenu = root.querySelector('menu#scene-controls-tools');
	if (!toolsMenu) return hideApplication(_, html);
	const streamDirectorItem = Array.from(toolsMenu.children).find(item => (item.children[0] as HTMLElement | undefined)?.ariaLabel === 'Open Stream Director') as HTMLElement | undefined;
	if (streamDirectorItem) toolsMenu.insertBefore(streamDirectorItem, toolsMenu.firstElementChild);
	Array.from(toolsMenu.children).forEach((item) => {
		if ((item.children[0] as HTMLElement | undefined)?.ariaLabel !== 'Open Stream Director') return;
		(item as HTMLElement).style.display = 'none';
	});
}

export function hideNotifications() {
	if (!getSetting('showChatNotificationsOnCanvas')) {
		const panel = document.querySelector('div#chat-notifications');
		if (panel) {
			(panel as HTMLElement).style.display = 'none';
		}
	} else {
		const textArea = document.querySelector('textarea#chat-message');
		if (textArea) {
			(textArea as HTMLElement).style.display = 'none';
		}
		const rollPrivacy = document.querySelector('div#roll-privacy');
		if (rollPrivacy) {
			(rollPrivacy as HTMLElement).style.display = 'none';
		}
		if ((game as ReadyGame).modules?.get('dice-calculator')?.active) {
			const diceTray = document.querySelector('section.dice-tray');
			if (diceTray) {
				(diceTray as HTMLElement).style.display = 'none';
			}
		}
		if (getSetting('leftAlignChatNotifications')) {
			const panel = document.querySelector('div#chat-notifications');
			if (panel) {
				const leftColumn = document.querySelector('#ui-left-column-1');
				if (leftColumn && panel.parentElement !== leftColumn) leftColumn.appendChild(panel);
			}
		}
	}
}

export function hideTokenBorder(token: Token | undefined) {
	if (token?.border?.alpha) {
		token.border.alpha = 0;
	}
}

function getAutoTokens(): Token[] | undefined {
	const trackObserverTokens = getSetting('trackObserverTokens') === true;
	// @ts-expect-error Modifying Internals, no types available
	return (game as ReadyGame).canvas?.tokens?.objects?.children.filter((token: Token) => (trackObserverTokens && token.observer === true) || token.isOwner === true);
}

function getPlayerTokens(): Token[] | undefined {
	const playerCharacters = (game as ReadyGame).users?.players.filter(e => (e as User).character != null).map(player => (player as User).character!.id);
	// @ts-expect-error Modifying Internals, no types available
	return (game as ReadyGame).canvas?.tokens?.objects?.children.filter((token: Token) => playerCharacters?.includes(token?.actor?.id ?? null)).filter((token: Token) => token !== undefined);
}

function getManualToken() {
	return (game as ReadyGame).canvas?.scene?.tokens?.filter(token => !!token.getFlag('obs-utils', 'tracked')).map(token => token.object as Token);
}

function toggleToken(tokenDocument: TokenDocument) {
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
	if ((game as ReadyGame).combat?.started) {
		switch (getSetting('defaultInCombat')) {
			case 'trackall':
				trackAll();
				break;
			case 'trackone':
				trackTokenList([
					getAutoTokens()!.find(
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

function calculateBoundsOfCoodinates(coordSet: { x: number; y: number; width: number; height: number }[]) {
	let minX: number, maxX: number, minY: number, maxY: number;
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

export function viewportChanged(userId: string) {
	const user = (game as ReadyGame).users?.get(userId) as User | undefined;
	if (user?.viewedScene !== (game as ReadyGame | undefined)?.user?.viewedScene) {
		return;
	}
	if ((game as ReadyGame).combat?.started) {
		switch (getSetting('defaultInCombat')) {
			case 'cloneDM':
				if (user?.isGM) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						clampAndApply(viewportData);
				}
				break;
			case 'cloneTurnPlayer':
				if (getCurrentCombatants()?.some(e => e.id === userId)) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						clampAndApply(viewportData);
				}
				break;
			case 'clonePlayer':
				if (userId === getSetting('trackedUser')) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						clampAndApply(viewportData);
				}
				break;
			default:
				break;
		}
	} else {
		switch (getSetting('defaultOutOfCombat')) {
			case 'cloneDM':

				if (user?.isGM) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						clampAndApply(viewportData);
				}
				break;
			case 'clonePlayer':
				if (userId === getSetting('trackedUser')) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						clampAndApply(viewportData);
				}
				break;
			default:
				break;
		}
	}
}

export function isGM() {
	return (game as ReadyGame).user?.isGM;
}

export function expandTokenHud(_tokenHud: TokenHUD, html: HTMLElement, token: TokenDocument) {
	if ((game as ReadyGame).user?.isGM) {
		const rightSide = html.querySelector('div.col.right');
		if (!rightSide) return;
		const isTracked = !!token.flags['obs-utils']?.tracked;
		const element = $(
			`<button type="button" class="control-icon ${
				isTracked ? 'active' : ''
			}"><i class="fa-solid fa-signal-stream" /></button>`,
		);
		element.on('click', function () {
			if (_tokenHud.object !== undefined) {
				toggleToken(_tokenHud.object.document);
				$(this).toggleClass('active');
			}
		});
		element.appendTo(rightSide);
	}
}

export function scaleToFit() {
	if (
		!(
			((game as ReadyGame).combat?.started && getSetting('defaultInCombat') === 'birdseye')
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

export async function closePopupWithDelay(popout: { close: () => void }) {
	const delay = getSetting('popupCloseDelay')!;
	if (delay > 0) {
		await sleep(delay * 1000);
		popout.close();
	}
}

export async function applyPopupConstrains(popout: { setPosition: (position: { left: number; top: number; width: number; height: number }) => void }) {
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
	ui.sidebar?.changeTab('combat', 'primary');
	ui.sidebar?.expand();
	document.querySelector('div#sidebar-content')?.removeAttribute('style');
}

export async function hideSidebar() {
	const container = ui.sidebar?.element as HTMLElement | undefined;
	if (container) {
		Array.from(container.children).forEach((el) => {
			(el as HTMLElement).style.display = 'none';
		});
	}
	ui.sidebar?.collapse();
}

export async function screenReload() {
	scaleToFit();
	tokenMoved();
}

function clamp(canvasPos: { x: number; y: number; scale: number }) {
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

function clampAndApply(canvasPos: { x: number; y: number; scale: number }) {
	if (getSetting('clampCanvas')) {
		canvasPos = clamp(canvasPos);
	}
	canvas!.animatePan(canvasPos).then();
}
