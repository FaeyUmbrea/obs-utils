import type { OverlayAnimationData, OverlayTrack, TrackComponentLane, TrackKeyframe } from './overlayAnimation.ts';
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

export interface LegacyRollOverlayConfig {
	preRollEnabled?: boolean;
	postRollEnabled?: boolean;
	preRollDelay?: number;
	preRollFadeIn?: number;
	preRollFadeOut?: number;
	preRollStay?: number;
	rollFadeIn?: number;
	rollFadeOut?: number;
	rollStay?: number;
	postRollFadeIn?: number;
	postRollFadeOut?: number;
	postRollStay?: number;
	preRollImage?: string;
	rollBackground?: string;
	rollForeground?: string;
	postRollImage?: string;
}

// Builds the 4.x / 5.0 roll overlay as a tile-per-player WYSIWYG layer
// driven by `core.onPlayerRoll`. Pre / roll / post phases each get their
// own track chained through `transition-on-end`, mirroring the legacy
// delay → fade-in → stay → fade-out timeline. Components are stacked at
// (0, 0) sized to the 250×250 render area the 4.x overlay used.
export function makeRollOverlayFromLegacyConfig(c: LegacyRollOverlayConfig): OverlayData {
	const W = 250;
	const H = 250;
	const n = (v: number | undefined, d: number) => (typeof v === 'number' ? v : d);

	const preRollDelay = n(c.preRollDelay, 0);
	const preRollFadeIn = n(c.preRollFadeIn, 0);
	const preRollFadeOut = n(c.preRollFadeOut, 0);
	const preRollStay = n(c.preRollStay, 0);
	const rollFadeIn = n(c.rollFadeIn, 0);
	const rollFadeOut = n(c.rollFadeOut, 0);
	const rollStay = n(c.rollStay, 5000);
	const postRollFadeIn = n(c.postRollFadeIn, 0);
	const postRollFadeOut = n(c.postRollFadeOut, 0);
	const postRollStay = n(c.postRollStay, 0);

	const bg = comp('img', c.rollBackground ?? '', 0, 0, W, H);
	const total = comp('pt', 'trigger.total', 0, 0, W, H, 'display:flex;align-items:center;justify-content:center;'
		+ 'font-size:96px;font-weight:bold;color:#fff;'
		+ 'text-shadow:0 2px 6px rgba(0,0,0,0.7);');
	const fg = comp('img', c.rollForeground ?? '', 0, 0, W, H);
	const pre = comp('img', c.preRollImage ?? '', 0, 0, W, H);
	const post = comp('img', c.postRollImage ?? '', 0, 0, W, H);
	const components = [bg, total, fg, pre, post];

	const hiddenLane = (cmp: OverlayComponentData): TrackComponentLane => ({
		componentId: cmp.id!,
		keyframes: [{ t: 0, opacity: 0 }],
	});

	// Linear opacity envelope. Co-temporal keyframes (any zero-length
	// fade/stay) collapse so the player sees a clean snap at that point
	// instead of an undefined duplicate t.
	const fadeLane = (cmp: OverlayComponentData, delay: number, fadeIn: number, stay: number, fadeOut: number): TrackComponentLane => {
		const out: TrackKeyframe[] = [];
		const push = (t: number, opacity: number) => {
			if (out.length > 0 && out[out.length - 1].t === t) {
				out[out.length - 1] = { t, opacity };
			} else {
				out.push({ t, opacity });
			}
		};
		push(0, 0);
		let t = 0;
		if (delay > 0) push(t = delay, 0);
		push(t = delay + fadeIn, 1);
		if (stay > 0) push(t += stay, 1);
		push(t + fadeOut, 0);
		return { componentId: cmp.id!, keyframes: out };
	};

	const hasPre = !!c.preRollEnabled && !!c.preRollImage;
	const hasPost = !!c.postRollEnabled && !!c.postRollImage;
	const tracks: OverlayTrack[] = [];

	tracks.push({
		id: 'idle',
		name: 'Idle',
		durationMs: 0,
		behavior: { type: 'static' },
		lanes: components.map(hiddenLane),
	});

	const rollNext = hasPost ? 'post' : 'idle';
	tracks.push({
		id: 'roll',
		name: 'Roll',
		durationMs: rollFadeIn + rollStay + rollFadeOut,
		behavior: { type: 'transition-on-end', toTrackId: rollNext, toTime: 0 },
		lanes: components.map(cmp =>
			(cmp === bg || cmp === total || cmp === fg)
				? fadeLane(cmp, 0, rollFadeIn, rollStay, rollFadeOut)
				: hiddenLane(cmp),
		),
	});

	if (hasPost) {
		tracks.push({
			id: 'post',
			name: 'Post-Roll',
			durationMs: postRollFadeIn + postRollStay + postRollFadeOut,
			behavior: { type: 'transition-on-end', toTrackId: 'idle', toTime: 0 },
			lanes: components.map(cmp =>
				cmp === post ? fadeLane(cmp, 0, postRollFadeIn, postRollStay, postRollFadeOut) : hiddenLane(cmp),
			),
		});
	}

	let entryTrackId = 'roll';
	if (hasPre) {
		tracks.push({
			id: 'pre',
			name: 'Pre-Roll',
			durationMs: preRollDelay + preRollFadeIn + preRollStay + preRollFadeOut,
			behavior: { type: 'transition-on-end', toTrackId: 'roll', toTime: 0 },
			lanes: components.map(cmp =>
				cmp === pre ? fadeLane(cmp, preRollDelay, preRollFadeIn, preRollStay, preRollFadeOut) : hiddenLane(cmp),
			),
		});
		entryTrackId = 'pre';
	}

	const animation: OverlayAnimationData = {
		tracks,
		initialTrackId: 'idle',
		transitions: [{
			triggerKey: 'core.onPlayerRoll',
			fromTrackId: 'idle',
			zones: [{ startT: 0, endT: 0, destination: { type: 'goto', toTrackId: entryTrackId, toTime: 0 } }],
		}],
	};

	const o = new OverlayData('wysiwyg', components, '', { w: W, h: H }, 'Roll Overlay');
	o.tileBy = 'players';
	o.animation = animation;
	return o;
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
