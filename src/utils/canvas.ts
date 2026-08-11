import { getCurrentCombatants } from './combat.ts';
import { getActiveGM, isOBS, sleep } from './helpers.ts';
import { applyLevel, getCurrentLevelId, getScenePins, resolveLevelForTokens, tokensOnLevel } from './levels.ts';
import { getSetting } from './settings.ts';

/**
 * A tracked user's camera position, plus the floor they were standing on.
 *
 * `level` rides the same payload as the position rather than travelling on its
 * own event so a floor change and the camera position that belongs to it are
 * applied as one decision. Split across two messages they race the receiver's
 * redraw and produce a visibly wrong frame. It is `undefined` on v13, where
 * Scene Levels does not exist.
 */
export interface ViewportPayload { x: number; y: number; scale: number; level?: string }

export const VIEWPORT_DATA: Map<string, ViewportPayload> = new Map();

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
		if (button.dataset.action === 'control' && button.dataset.control === 'tokens') {
			button.click();
		} else {
			button.style.display = 'none';
		}
	});
	const toolsMenu = root.querySelector('menu#scene-controls-tools');
	if (!toolsMenu) return hideApplication(_, html);
	const streamDirectorItem = Array.from(toolsMenu.children).find(item => (item.children[0] as HTMLElement | undefined)?.dataset.tool === 'openStreamDirector') as HTMLElement | undefined;
	if (streamDirectorItem) toolsMenu.insertBefore(streamDirectorItem, toolsMenu.firstElementChild);
	Array.from(toolsMenu.children).forEach((item) => {
		if ((item.children[0] as HTMLElement | undefined)?.dataset.tool === 'openStreamDirector') return;
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
	const user = (game as ReadyGame).user as User | undefined;
	// @ts-expect-error Modifying Internals, no types available
	return (game as ReadyGame).canvas?.tokens?.objects?.children.filter((token: Token) => {
		if (!token) return false;
		if (token.isOwner) return true;
		if (!trackObserverTokens || !user) return false;
		try {
			return token.document.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
		} catch {
			return false;
		}
	});
}

function getPlayerTokens(): Token[] | undefined {
	const playerCharacters = (game as ReadyGame).users?.players.filter(e => (e as User).character != null).map(player => (player as User).character!.id);
	// @ts-expect-error Modifying Internals, no types available
	return (game as ReadyGame).canvas?.tokens?.objects?.children.filter((token: Token) => playerCharacters?.includes(token?.actor?.id ?? null)).filter((token: Token) => token !== undefined);
}

function getManualToken() {
	return (game as ReadyGame).canvas?.scene?.tokens?.filter(token => !!token.getFlag('obs-utils', 'tracked')).map(token => token.object as Token);
}

/** Flip a token's manual tracking flag. Returns the new state so callers can report it. */
export function toggleToken(tokenDocument: TokenDocument) {
	const value = !tokenDocument.getFlag('obs-utils', 'tracked');
	tokenDocument.setFlag('obs-utils', 'tracked', value);
	return value;
}

export function getCurrentUser() {
	return (game as ReadyGame).userId;
}

function trackAll() {
	trackTokenList(getAutoTokens() ?? []);
}

function trackTokenList(tokens: Token[]) {
	// A group has no inherent floor, so a policy picks one and the framing is
	// then restricted to it. Left unrestricted, a party split across two floors
	// produces a bounding box centred between them — a shot of neither.
	const levelId = resolveLevelForTokens(tokens);
	const framed = tokensOnLevel(tokens, levelId);

	const coordinates: { x: number; y: number; width: number; height: number }[] = [];

	framed?.forEach((token) => {
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
	// Read per call: this is what makes a tile count behave the same on a
	// 50px-grid map and a 200px-grid one.
	const gridSize = canvas!.scene!.dimensions.size;

	// Frame Margin is expressed per side, so it counts twice across the span.
	const margin = getSetting('frameMargin')! * gridSize * 2;

	const scaleX = screenDimensions[0] / (bounds.maxX - bounds.minX + margin);
	const scaleY = screenDimensions[1] / (bounds.maxY - bounds.minY + margin);

	const closest = getSetting('closestView')!;
	// A pair set the wrong way round degrades to a fixed zoom rather than
	// fighting itself.
	const widest = Math.max(getSetting('widestView')!, closest);

	let scale = Math.min(scaleX, scaleY);
	scale = Math.min(scale, tilesToScale(closest, screenDimensions[0], gridSize));
	scale = Math.max(scale, tilesToScale(widest, screenDimensions[0], gridSize));

	applyThenPan(levelId, { x: bounds.center.x, y: bounds.center.y, scale });
}

/**
 * Pan, changing floor first if the policy asked for a different one.
 *
 * Deliberately synchronous when no floor change is needed, which is almost
 * every frame — a redraw is rare and shouldn't cost the 30 Hz path a microtask.
 * When a change is needed the pan waits for the draw, because
 * `initializeCanvasPosition()` re-seeds from the scene's cached `_viewPosition`
 * on the way back and would discard a pan issued first.
 */
function applyThenPan(levelId: string | undefined, position: { x: number; y: number; scale: number }) {
	if (!levelId || levelId === getCurrentLevelId()) {
		clampAndApply(position);
		return;
	}
	applyLevel(levelId).then((reached) => {
		// Unreachable floor holds the last good frame rather than panning to a
		// correct coordinate on a floor the stream isn't showing.
		if (reached) clampAndApply(position);
	});
}

/**
 * Convert a horizontal tile count into a canvas scale.
 *
 * More tiles visible is a *smaller* scale. This function is the only place that
 * inversion has to be reasoned about — every caller and every setting reads in
 * tiles, so `Closest View` being a `Math.min` on scale is correct even though it
 * looks backwards at the call site.
 */
export function tilesToScale(tiles: number, screenWidth: number, gridSize: number) {
	return screenWidth / (tiles * gridSize);
}

export function tokenMoved() {
	if ((game as ReadyGame).combat?.started) {
		switch (getSetting('defaultInCombat')) {
			case 'trackall':
				trackAll();
				break;
			case 'trackone': {
				const target = getAutoTokens()?.find(t => t.id === (game as ReadyGame).combat?.combatant?.tokenId);
				if (target) trackTokenList([target]);
				break;
			}
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
			case 'trackToken': {
				// Out-of-combat counterpart to `trackone`. The nominated token is
				// stored by id per scene; the placeable is looked up fresh because
				// objects are destroyed and rebuilt across redraws.
				const pinned = getScenePins().trackedToken;
				const token = pinned ? ((game as ReadyGame).canvas?.tokens?.get(pinned) as Token | undefined) : undefined;
				if (token) trackTokenList([token]);
				break;
			}
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

/**
 * Apply a tracked user's viewport, floor first.
 *
 * Order is load-bearing. `scene.view()` runs a full redraw, and
 * `initializeCanvasPosition()` re-seeds the view from the scene's cached
 * `_viewPosition` when it returns — so a pan issued before the draw settles is
 * silently thrown away. It also has to be the position that arrived alongside
 * this level, never a buffered one, which is pre-change by definition.
 */
async function applyTrackedViewport(data: ViewportPayload) {
	if (!(await applyLevel(data.level))) return;
	clampAndApply(data);
}

export function viewportChanged(userId: string) {
	// Pause suppresses application only. Recording happens on receipt in
	// socket.ts so the list stays warm through a pause.
	if (getSetting('pauseCameraTracking')) return;
	const user = (game as ReadyGame).users?.get(userId) as User | undefined;
	if (user?.viewedScene !== (game as ReadyGame | undefined)?.user?.viewedScene) {
		return;
	}
	if ((game as ReadyGame).combat?.started) {
		switch (getSetting('defaultInCombat')) {
			case 'cloneDM': {
				const active = getActiveGM();
				if (active && user?.id === active.id) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						applyTrackedViewport(viewportData).then();
				}
				break;
			}
			case 'cloneTurnPlayer':
				if (getCurrentCombatants()?.some(e => e.id === userId)) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						applyTrackedViewport(viewportData).then();
				}
				break;
			case 'clonePlayer':
				if (userId === getSetting('trackedUser')) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						applyTrackedViewport(viewportData).then();
				}
				break;
			default:
				break;
		}
	} else {
		switch (getSetting('defaultOutOfCombat')) {
			case 'cloneDM': {
				const active = getActiveGM();
				if (active && user?.id === active.id) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						applyTrackedViewport(viewportData).then();
				}
				break;
			}
			case 'clonePlayer':
				if (userId === getSetting('trackedUser')) {
					const viewportData = VIEWPORT_DATA.get(userId);
					if (viewportData !== undefined)
						applyTrackedViewport(viewportData).then();
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

	// Framing is identical on every floor — canvas dimensions come from the
	// Scene, with no Level input — so birdseye only needs the floor choice. It
	// has no token set of its own, so it borrows the same one `trackAll` uses.
	applyThenPan(resolveLevelForTokens(getAutoTokens() ?? []), { ...center, scale });
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

/** Map our string-named easing setting to a Foundry CanvasAnimation easing function. */
function getEasingFn() {
	const name = (getSetting('cameraEasing') ?? 'easeOutCubic') as string;
	// V13 exposes CanvasAnimation under foundry.canvas.animation
	const CA: any = (foundry as any)?.canvas?.animation?.CanvasAnimation ?? (globalThis as any).CanvasAnimation;
	if (!CA) return undefined;
	switch (name) {
		case 'linear': return undefined; // Foundry's default linear when no easing fn passed
		case 'easeInCircle': return CA.easeInCircle;
		case 'easeOutCircle': return CA.easeOutCircle;
		case 'easeInOutCircle': return CA.easeInOutCircle ?? CA.easeOutCircle;
		case 'easeInCosine': return CA.easeInCosine;
		case 'easeOutCosine': return CA.easeOutCosine;
		case 'easeInOutCosine': return CA.easeInOutCosine ?? CA.easeOutCosine;
		// Cubic isn't always in CanvasAnimation; fall back to circle approximation.
		case 'easeOutCubic': return CA.easeOutCircle;
		case 'easeInOutCubic': return CA.easeInOutCircle ?? CA.easeOutCircle;
		default: return CA.easeOutCircle;
	}
}

function clampAndApply(canvasPos: { x: number; y: number; scale: number }) {
	if (getSetting('clampCanvas')) {
		canvasPos = clamp(canvasPos);
	}
	// 'direct' = no perceived easing. The sender emits at ~30 Hz, so a 33 ms
	// linear tween bridges each pair of samples without adding latency. A
	// raw pan() would snap and re-introduce the per-sample jitter we're
	// trying to avoid.
	if (getSetting('cameraEasing') === 'direct') {
		canvas!.animatePan({ ...canvasPos, duration: 33 }).then();
		return;
	}
	const duration = Math.max(0, Math.min(2000, getSetting('cameraSmoothing') ?? 400));
	const easing = getEasingFn();
	const opts: any = { ...canvasPos, duration };
	if (easing) opts.easing = easing;
	canvas!.animatePan(opts).then();
}

/** Public wrapper around clampAndApply for use by the multi-GM handover. */
export function clampAndApplyExternal(canvasPos: { x: number; y: number; scale: number }) {
	clampAndApply(canvasPos);
}

/** Read the local canvas viewport (current pan + zoom). */
export function getLocalViewport(): { x: number; y: number; scale: number } | null {
	const stage = (canvas as any)?.stage;
	if (!stage) return null;
	return {
		x: stage.pivot?.x ?? 0,
		y: stage.pivot?.y ?? 0,
		scale: stage.scale?.x ?? 1,
	};
}
