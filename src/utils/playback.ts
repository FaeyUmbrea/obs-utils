import type { OverlayTrack, ZoneDestination } from './overlayAnimation.ts';
import type { ComponentFrame, OverlayFrame } from './render.ts';
import type { TriggerRegistry } from './triggers.ts';
import type { OverlayData } from './types.ts';
import { computeTrackFrame, findActiveZone } from './overlayAnimation.ts';

interface TileState {
	overlay: OverlayData;
	tileKey: string;
	currentTrackId: string;
	startWall: number;
	lastTriggerKey?: string;
}

function stateKey(overlayId: string, tileKey: string): string {
	return `${overlayId}:${tileKey}`;
}

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

	unmountTile(overlayId: string, tileKey: string): void {
		const key = stateKey(overlayId, tileKey);
		this.states.delete(key);
		this.frames.delete(key);
	}

	start(): void {
		if (this.running) return;
		this.running = true;
		this.scheduleTick();
	}

	stop(): void {
		this.running = false;
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		for (const unsub of this.perTriggerUnsubs) unsub();
		this.perTriggerUnsubs.length = 0;
	}

	private readonly subscribedTriggers = new Set<string>();

	private subscribeTransitions(overlay: OverlayData): void {
		const transitions = overlay.animation?.transitions ?? [];
		for (const tr of transitions) {
			if (this.subscribedTriggers.has(tr.triggerKey)) continue;
			this.subscribedTriggers.add(tr.triggerKey);
			try {
				this.registry.register({ key: tr.triggerKey });
			} catch { /* already registered */ }
			const unsub = this.registry.subscribe(tr.triggerKey, () => this.handleTriggerFire(tr.triggerKey));
			this.perTriggerUnsubs.push(unsub);
		}
	}

	private handleTriggerFire(key: string): void {
		const now = performance.now();
		for (const state of this.states.values()) {
			const track = this.getTrack(state);
			// Static tracks have no advancing playhead — pin to 0 so [0, x) zones match.
			const playheadT = track?.behavior.type === 'static'
				? 0
				: Math.max(0, now - state.startWall);
			const transitions = state.overlay.animation?.transitions ?? [];
			for (const tr of transitions) {
				if (tr.triggerKey !== key) continue;
				if (tr.fromTrackId !== state.currentTrackId) continue;
				let zone = findActiveZone(tr, playheadT);
				// Static tracks: fall back to first zone when explicit matching fails.
				if (!zone && track?.behavior.type === 'static') zone = tr.zones[0];
				if (!zone) continue;
				state.lastTriggerKey = key;
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

	private advanceTrack(state: TileState, now: number): void {
		const track = this.getTrack(state);
		if (!track) return;
		if (track.behavior.type === 'static') return;
		const playheadT = now - state.startWall;
		if (track.durationMs <= 0) return;
		if (playheadT < track.durationMs) return;
		if (track.behavior.type === 'looping') {
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
			triggerKey: state.lastTriggerKey,
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
