import type { OverlayTrack, ZoneDestination } from './overlayAnimation.ts';
import type { ComponentFrame, OverlayFrame } from './render.ts';
import type { OverlayData } from './types.ts';
import type { TriggerRegistry } from './triggers.ts';
import { computeTrackFrame, findActiveZone } from './overlayAnimation.ts';

/**
 * Per (overlay-id × tile-key) playback state. Drives the active track's
 * playhead, handles end-of-track behavior, and dispatches to transitions on
 * incoming trigger fires.
 */
interface TileState {
	overlay: OverlayData;
	tileKey: string;
	currentTrackId: string;
	/** Wall-clock ms when the current track started — playhead = now - startWall. */
	startWall: number;
}

/**
 * Build a stable key for the playback engine's per-tile maps.
 */
function stateKey(overlayId: string, tileKey: string): string {
	return `${overlayId}:${tileKey}`;
}

/**
 * Track playback engine. One per host (`/stream`, editor canvas).
 *
 * Owns per-tile track state and produces a reactive `OverlayFrame` map the
 * renderer consumes. Subscribes to the trigger registry — incoming fires are
 * resolved against the current tile's track + zones to decide whether to
 * switch tracks or jump the playhead.
 *
 * Lifecycle: `start()` after the host wires its registry; `stop()` on host
 * unmount. The RAF loop only runs while at least one active track is non-
 * static — purely static configurations cost zero per-frame work.
 */
export class PlaybackEngine {
	private readonly states = new Map<string, TileState>();
	private readonly frames: Map<string, OverlayFrame>;
	private readonly registry: TriggerRegistry;
	private readonly onFramesChanged: () => void;
	private readonly perTriggerUnsubs: Array<() => void> = [];

	private rafId: number | null = null;
	private running = false;

	constructor(
		registry: TriggerRegistry,
		frames: Map<string, OverlayFrame>,
		onFramesChanged: () => void,
	) {
		this.registry = registry;
		this.frames = frames;
		this.onFramesChanged = onFramesChanged;
	}

	/**
	 * Register a (overlay, tile) pair with the engine. Initial track is the
	 * overlay's declared `initialTrackId`. Computes the first frame snapshot
	 * synchronously so the first render shows the right state.
	 */
	mountTile(overlay: OverlayData, tileKey: string): void {
		if (!overlay.animation) return;
		const key = stateKey(overlay.id ?? '', tileKey);
		if (this.states.has(key)) return;
		const state: TileState = {
			overlay,
			tileKey,
			currentTrackId: overlay.animation.initialTrackId,
			startWall: performance.now(),
		};
		this.states.set(key, state);
		this.subscribeTransitions(overlay);
		this.computeFrame(state);
	}

	/**
	 * Drop a (overlay, tile) pair. Called when the tile leaves the bound set
	 * (actor removed from list, user disconnected when tiling by players, etc).
	 */
	unmountTile(overlayId: string, tileKey: string): void {
		const key = stateKey(overlayId, tileKey);
		this.states.delete(key);
		this.frames.delete(key);
	}

	/** Run the RAF tick loop. Idempotent. */
	start(): void {
		if (this.running) return;
		this.running = true;
		this.scheduleTick();
	}

	/** Stop ticks and tear down trigger subscriptions. */
	stop(): void {
		this.running = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		for (const unsub of this.perTriggerUnsubs) unsub();
		this.perTriggerUnsubs.length = 0;
	}

	// ─── trigger plumbing ─────────────────────────────────────────────────────

	private readonly subscribedTriggers = new Set<string>();

	/**
	 * Subscribe to every trigger key referenced by any of this overlay's
	 * transitions. We register one registry-level subscription per key
	 * regardless of how many overlays consume it — the registry already
	 * deduplicates Foundry-side hooks.
	 */
	private subscribeTransitions(overlay: OverlayData): void {
		const transitions = overlay.animation?.transitions ?? [];
		for (const tr of transitions) {
			if (this.subscribedTriggers.has(tr.triggerKey)) continue;
			this.subscribedTriggers.add(tr.triggerKey);
			try { this.registry.register({ key: tr.triggerKey }); } catch { /* already registered */ }
			const unsub = this.registry.subscribe(tr.triggerKey, () => this.handleTriggerFire(tr.triggerKey));
			this.perTriggerUnsubs.push(unsub);
		}
	}

	private handleTriggerFire(key: string): void {
		const now = performance.now();
		for (const state of this.states.values()) {
			const transitions = state.overlay.animation?.transitions ?? [];
			for (const tr of transitions) {
				if (tr.triggerKey !== key) continue;
				if (tr.fromTrackId !== state.currentTrackId) continue;
				const playheadT = now - state.startWall;
				const zone = findActiveZone(tr, playheadT);
				if (!zone) continue;
				this.applyDestination(state, zone.destination, now);
			}
		}
		this.onFramesChanged();
	}

	private applyDestination(state: TileState, dest: ZoneDestination, now: number): void {
		if (dest.type === 'ignore') return;
		state.currentTrackId = dest.toTrackId;
		state.startWall = now - dest.toTime;
		this.computeFrame(state);
	}

	// ─── per-tick frame computation ────────────────────────────────────────────

	private scheduleTick(): void {
		if (!this.running) return;
		this.rafId = requestAnimationFrame(now => this.tick(now));
	}

	private tick(now: number): void {
		let changed = false;
		for (const state of this.states.values()) {
			const before = this.frames.get(stateKey(state.overlay.id ?? '', state.tileKey));
			this.advanceTrack(state, now);
			const after = this.computeFrame(state);
			if (!framesEqual(before, after)) changed = true;
		}
		if (changed) this.onFramesChanged();
		this.scheduleTick();
	}

	/**
	 * End-of-track behavior. Looping wraps the playhead; transition-on-end
	 * switches tracks. Static tracks never advance (their `evalT` is forced
	 * to 0 in `computeTrackFrame`).
	 */
	private advanceTrack(state: TileState, now: number): void {
		const track = this.getTrack(state);
		if (!track) return;
		if (track.behavior.type === 'static') return;
		const playheadT = now - state.startWall;
		if (track.durationMs <= 0) return;
		if (playheadT < track.durationMs) return;
		if (track.behavior.type === 'looping') {
			// Wrap. Drop excess time into the next loop.
			state.startWall = now - (playheadT % track.durationMs);
			return;
		}
		if (track.behavior.type === 'transition-on-end') {
			state.currentTrackId = track.behavior.toTrackId;
			state.startWall = now - track.behavior.toTime;
		}
	}

	private computeFrame(state: TileState): OverlayFrame | undefined {
		const track = this.getTrack(state);
		if (!track) return undefined;
		const playheadT = track.behavior.type === 'static'
			? 0
			: Math.max(0, performance.now() - state.startWall);
		const componentFrames = new Map<string, ComponentFrame>();
		for (const [componentId, kf] of computeTrackFrame(track, playheadT)) {
			componentFrames.set(componentId, kf);
		}
		const frame: OverlayFrame = {
			activeTrackId: state.currentTrackId,
			playheadT,
			components: componentFrames,
		};
		this.frames.set(stateKey(state.overlay.id ?? '', state.tileKey), frame);
		return frame;
	}

	private getTrack(state: TileState): OverlayTrack | undefined {
		return state.overlay.animation?.tracks.find(t => t.id === state.currentTrackId);
	}
}

function framesEqual(a: OverlayFrame | undefined, b: OverlayFrame | undefined): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	if (a.activeTrackId !== b.activeTrackId) return false;
	if (a.playheadT !== b.playheadT) return false;
	if (a.components.size !== b.components.size) return false;
	for (const [id, frameA] of a.components) {
		const frameB = b.components.get(id);
		if (!frameB) return false;
		if (frameA.opacity !== frameB.opacity) return false;
		if (frameA.x !== frameB.x || frameA.y !== frameB.y) return false;
		if (frameA.rotation !== frameB.rotation) return false;
		if (frameA.scaleX !== frameB.scaleX || frameA.scaleY !== frameB.scaleY) return false;
	}
	return true;
}
