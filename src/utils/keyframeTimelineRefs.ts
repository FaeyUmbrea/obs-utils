import type { AnimatablePropertyKey, EasingV2 } from './overlayAnimation.ts';
import type { OverlayTrack } from './types.ts';

export type Selection
	= | { kind: 'component'; componentId: string }
		| { kind: 'property'; componentId: string; prop: AnimatablePropertyKey }
		| { kind: 'legacy-kf'; componentId: string; index: number }
		| { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number };

export type KfRef
	= | { kind: 'legacy'; componentId: string; index: number }
		| { kind: 'prop'; componentId: string; prop: AnimatablePropertyKey; index: number };

export type DragTarget
	= | { kind: 'legacy'; componentId: string; index: number; startX: number; startT: number }
		| { kind: 'prop'; componentId: string; prop: AnimatablePropertyKey; index: number; startX: number; startT: number }
		| { kind: 'aggregate'; componentId: string; times: number[]; startX: number; startBaseT: number }
		| { kind: 'multi'; startX: number; refs: Array<KfRef & { startT: number }> }
		| { kind: 'lasso'; startX: number; startY: number; endX: number; endY: number };

export const USER_ANIMATABLE_PROPERTIES: AnimatablePropertyKey[] = ['opacity', 'x', 'y', 'rotation'];
export const TIMELINE_INSET = 8;
export const STEP_MS = 1;

export function kfRefId(ref: KfRef): string {
	return ref.kind === 'legacy'
		? `legacy:${ref.componentId}:${ref.index}`
		: `prop:${ref.componentId}:${ref.prop}:${ref.index}`;
}

export function parseKfRef(s: string): KfRef | null {
	const parts = s.split(':');
	if (parts[0] === 'legacy' && parts.length === 3) {
		return { kind: 'legacy', componentId: parts[1], index: Number(parts[2]) };
	}
	if (parts[0] === 'prop' && parts.length === 4) {
		return { kind: 'prop', componentId: parts[1], prop: parts[2] as AnimatablePropertyKey, index: Number(parts[3]) };
	}
	return null;
}

export function kfRefTime(track: OverlayTrack, ref: KfRef): number | null {
	const lane = track.lanes.find(l => l.componentId === ref.componentId);
	if (!lane) return null;
	if (ref.kind === 'legacy') return lane.keyframes[ref.index]?.t ?? null;
	return lane.propertyKeyframes?.[ref.prop]?.[ref.index]?.t ?? null;
}

export function kfMarkerClass(easing: EasingV2 | undefined): string {
	const interp = easing?.interpolation ?? 'bezier';
	if (interp === 'constant') return 'kf-marker kf-constant';
	if (interp === 'linear') return 'kf-marker kf-linear';
	const eq = easing?.equation ?? 'sinusoidal';
	return `kf-marker kf-bezier kf-eq-${eq}`;
}

export function tToX(t: number, durationMs: number, timelineInner: number): number {
	if (durationMs <= 0) return TIMELINE_INSET;
	return TIMELINE_INSET + (t / durationMs) * timelineInner;
}

export function xToT(x: number, durationMs: number, timelineInner: number): number {
	if (durationMs <= 0) return 0;
	return Math.max(0, Math.min(durationMs, ((x - TIMELINE_INSET) / timelineInner) * durationMs));
}
