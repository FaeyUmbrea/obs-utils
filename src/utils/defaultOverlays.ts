import type { OverlayAnimationData, OverlayTrack, TrackKeyframe } from './overlayAnimation.ts';
import { OverlayComponentData, OverlayData } from './types.ts';

function comp(
	type: string,
	data: string,
	x: number,
	y: number,
	w: number,
	h: number,
	style = '',
): OverlayComponentData {
	const c = new OverlayComponentData(type, data, style);
	c.x = x;
	c.y = y;
	c.w = w;
	c.h = h;
	return c;
}

function track(
	id: string,
	name: string,
	durationMs: number,
	behavior: OverlayTrack['behavior'],
	lanes: OverlayTrack['lanes'] = [],
): OverlayTrack {
	return { id, name, durationMs, behavior, lanes };
}

function kf(t: number, patch: Partial<TrackKeyframe> = {}): TrackKeyframe {
	return { t, ease: 'easeInOut', ...patch };
}

// Card sits in the lower-third so it doesn't fight the chat box.
// On core.onPlayerRoll, idle jumps to reveal → slides + fades in, holds, exits back.
function makeRollRevealBanner(): OverlayData {
	const card = comp('pt', '', 0, 0, 480, 140, 'background:linear-gradient(140deg,#1c1330 0%,#2a1f4f 50%,#3a1d2e 100%);'
		+ 'border-radius:18px;border:1px solid rgba(255,209,102,0.35);'
		+ 'box-shadow:0 12px 32px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.05);');
	const dieIcon = comp('fai', 'fas fa-dice-d20', 18, 18, 64, 64, 'color:#ffd166;font-size:64px;filter:drop-shadow(0 2px 6px rgba(255,209,102,0.45));');
	const actorName = comp('pt', 'trigger.actor.name', 100, 20, 364, 28, 'font-weight:700;font-size:20px;color:#f6f1e7;text-shadow:0 1px 3px rgba(0,0,0,0.7);letter-spacing:0.3px;');
	const formula = comp('pt', 'trigger.formula', 100, 50, 240, 22, 'font-size:14px;color:#bcb1a4;font-family:monospace;');
	const total = comp('pt', 'trigger.total', 340, 52, 124, 72, 'font-weight:800;font-size:56px;color:#ffd166;text-align:right;line-height:1;'
		+ 'text-shadow:0 2px 8px rgba(255,209,102,0.45);font-feature-settings:"tnum";');

	const o = new OverlayData('wysiwyg', [card, dieIcon, actorName, formula, total], '', { w: 1920, h: 1080 }, 'Roll Reveal');
	const cx = (1920 - 480) / 2;
	const cy = 1080 - 220;
	for (const c of [card, dieIcon, actorName, formula, total]) {
		c.x = (c.x ?? 0) + cx;
		c.y = (c.y ?? 0) + cy;
	}
	o.tileBy = 'players';

	const idleId = 'idle';
	const revealId = 'reveal';
	const revealLane = (c: OverlayComponentData): OverlayTrack['lanes'][number] => ({
		componentId: c.id!,
		keyframes: [
			kf(0, { opacity: 0, x: 0, y: 80, scaleX: 0.96, scaleY: 0.96, ease: 'power2.out' }),
			kf(280, { opacity: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, ease: 'power2.out' }),
			kf(2400, { opacity: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, ease: 'power2.in' }),
			kf(2800, { opacity: 0, x: 0, y: -24, scaleX: 0.98, scaleY: 0.98, ease: 'power2.in' }),
		],
	});
	const idleLane = (c: OverlayComponentData): OverlayTrack['lanes'][number] => ({
		componentId: c.id!,
		keyframes: [{ t: 0, opacity: 0, x: 0, y: 80 }],
	});

	const all = [card, dieIcon, actorName, formula, total];
	const anim: OverlayAnimationData = {
		tracks: [
			track(idleId, 'Idle', 0, { type: 'static' }, all.map(idleLane)),
			track(revealId, 'Reveal', 2800, { type: 'transition-on-end', toTrackId: idleId, toTime: 0 }, all.map(revealLane)),
		],
		initialTrackId: idleId,
		transitions: [{
			triggerKey: 'core.onPlayerRoll',
			fromTrackId: idleId,
			zones: [{ startT: 0, endT: 0, destination: { type: 'goto', toTrackId: revealId, toTime: 0 } }],
		}],
	};
	o.animation = anim;
	return o;
}

export function getExampleOverlay(): OverlayData {
	return makeRollRevealBanner();
}

// System companion modules may register their own starter set; last writer wins.
let registeredStarter: OverlayData[] | undefined;
// Cached so the template gallery and the create-on-click lookup see the same IDs.
let defaultStarterCache: OverlayData[] | undefined;

export function registerStarter(overlays: OverlayData[]): void {
	registeredStarter = overlays;
}

export function readStarterOverlays(): OverlayData[] {
	if (registeredStarter) return registeredStarter;
	if (!defaultStarterCache) defaultStarterCache = [getExampleOverlay()];
	return defaultStarterCache;
}
