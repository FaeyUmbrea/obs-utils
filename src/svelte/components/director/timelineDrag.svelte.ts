import type { CameraKeyframe } from '../../../utils/cameraPresets.ts';
import { SvelteSet } from 'svelte/reactivity';
import { updateKeyframeAt } from '../../../utils/cameraKeyframeOps.ts';

export type DragKind
	= | { kind: 'playhead'; startX: number; startMs: number }
		| { kind: 'keyframe'; index: number; startX: number; startMs: number }
		| { kind: 'keyframes-multi'; startX: number; snapshot: CameraKeyframe[]; selectedSet: SvelteSet<number> }
		| { kind: 'lasso'; startX: number; startMs: number; endMs: number };

export interface TimelineDragContext {
	/** Current sorted keyframes. */
	getKeyframes: () => CameraKeyframe[];
	getTotalMs: () => number;
	getZoom: () => number;
	getPlayheadMs: () => number;
	setPlayheadMs: (v: number) => void;
	getSelectedIndices: () => number[];
	setSelectedIndices: (next: number[]) => void;
	/** Strip width in pixels (live; read each call because the element resizes). */
	getStripWidth: () => number;
	/** Returns the strip element's bounding rect for client-x → strip-x math. */
	getStripRect: () => DOMRect | null;
	/** Patches the keyframes array on the preset. */
	onKeyframesChange: (next: CameraKeyframe[]) => void;
	/** Wheel zoom callback. */
	onZoomChange: (next: number) => void;
}

export class TimelineDragController {
	dragState = $state<DragKind | null>(null);

	#ctx: TimelineDragContext;

	constructor(ctx: TimelineDragContext) {
		this.#ctx = ctx;
	}

	/** Convert ms → strip pixel offset. */
	tToX(ms: number): number {
		const totalMs = this.#ctx.getTotalMs();
		if (totalMs <= 0) return 0;
		return (ms / totalMs) * this.#ctx.getStripWidth();
	}

	/** Convert strip pixel offset → ms (clamped). */
	xToT(x: number): number {
		const totalMs = this.#ctx.getTotalMs();
		const sw = this.#ctx.getStripWidth();
		if (totalMs <= 0 || sw <= 0) return 0;
		return Math.max(0, Math.min(totalMs, (x / sw) * totalMs));
	}

	onStripMouseDown(e: MouseEvent): void {
		const r = this.#ctx.getStripRect();
		if (!r) return;
		// Markers, stacks, and the playhead handle install their own onmousedown
		// handlers and stop propagation, so anything reaching here is the bare
		// timeline track.
		const newMs = Math.round(this.xToT(e.clientX - r.left));
		// Ctrl/Meta-drag on the strip starts a time-range lasso instead of
		// moving the playhead — any keyframe whose time falls inside the
		// finished range becomes selected on mouseup.
		if (e.ctrlKey || e.metaKey) {
			this.dragState = { kind: 'lasso', startX: e.clientX, startMs: newMs, endMs: newMs };
			e.preventDefault();
			return;
		}
		this.#ctx.setPlayheadMs(newMs);
		this.dragState = { kind: 'playhead', startX: e.clientX, startMs: newMs };
		e.preventDefault();
	}

	startPlayheadDrag(e: MouseEvent): void {
		e.preventDefault();
		e.stopPropagation();
		this.dragState = { kind: 'playhead', startX: e.clientX, startMs: this.#ctx.getPlayheadMs() };
	}

	startKfDrag(e: MouseEvent, idx: number): void {
		e.preventDefault();
		e.stopPropagation();
		const selectedIndices = this.#ctx.getSelectedIndices();
		const keyframes = this.#ctx.getKeyframes();
		// Ctrl/meta on a dot is "toggle selection only" — don't start a drag,
		// because the user is curating the selection set.
		if (e.ctrlKey || e.metaKey) {
			this.#selectToggle(idx);
			return;
		}
		// If the clicked keyframe is part of an existing multi-selection, drag
		// the whole batch together. Otherwise replace the selection and drag
		// just this one.
		if (selectedIndices.includes(idx) && selectedIndices.length > 1) {
			this.dragState = {
				kind: 'keyframes-multi',
				startX: e.clientX,
				snapshot: keyframes.map(k => ({ ...k })),
				selectedSet: new SvelteSet(selectedIndices),
			};
			return;
		}
		this.#selectOnly(idx);
		this.dragState = { kind: 'keyframe', index: idx, startX: e.clientX, startMs: keyframes[idx].time };
	}

	onWindowMouseMove(e: MouseEvent): void {
		if (!this.dragState || !this.#ctx.getStripRect()) return;
		const totalMs = this.#ctx.getTotalMs();
		const dx = e.clientX - this.dragState.startX;
		const dMs = (dx / this.#ctx.getStripWidth()) * totalMs;

		if (this.dragState.kind === 'playhead') {
			const newMs = Math.max(0, Math.min(totalMs, Math.round(this.dragState.startMs + dMs)));
			this.#ctx.setPlayheadMs(newMs);
			return;
		}

		if (this.dragState.kind === 'lasso') {
			const r = this.#ctx.getStripRect()!;
			const cur = Math.round(this.xToT(e.clientX - r.left));
			this.dragState = { ...this.dragState, endMs: cur };
			return;
		}

		if (this.dragState.kind === 'keyframes-multi') {
			// Rebuild from the immutable drag-start snapshot every frame.
			// This keeps multi-drag stable regardless of how the keyframe
			// array re-orders during the drag.
			const shifted = this.dragState.snapshot.map((k, i) => {
				if (!this.dragState!.selectedSet.has(i)) return k;
				const t = Math.max(0, Math.min(totalMs, Math.round(k.time + dMs)));
				return { ...k, time: t };
			});
			// Pair each shifted entry with its original index, sort by time,
			// then read the new positions of the originally-selected keyframes
			// out of the sort permutation.
			const paired = shifted.map((kf, origIdx) => ({ kf, origIdx }));
			paired.sort((a, b) => a.kf.time - b.kf.time);
			const next = paired.map(p => p.kf);
			const newSel: number[] = [];
			for (let i = 0; i < paired.length; i++) {
				if (this.dragState.selectedSet.has(paired[i].origIdx)) newSel.push(i);
			}
			this.#ctx.setSelectedIndices(newSel);
			this.#ctx.onKeyframesChange(next);
			return;
		}

		// Single keyframe drag.
		const ds = this.dragState;
		const keyframes = this.#ctx.getKeyframes();
		const newMs = Math.max(0, Math.min(totalMs, Math.round(ds.startMs + dMs)));
		const updated: CameraKeyframe = { ...keyframes[ds.index], time: newMs };
		const next = updateKeyframeAt(keyframes, ds.index, updated);
		const newIdx = next.findIndex(k => k === updated || (k.time === newMs && k.x === updated.x && k.y === updated.y));
		this.dragState = { ...ds, index: newIdx >= 0 ? newIdx : ds.index };
		this.#ctx.setSelectedIndices([this.dragState.index]);
		this.#ctx.onKeyframesChange(next);
	}

	onWindowMouseUp(): void {
		// Finalize lasso: select every keyframe whose time falls inside the
		// dragged range. Drop the rectangle by clearing dragState last.
		if (this.dragState?.kind === 'lasso') {
			const lo = Math.min(this.dragState.startMs, this.dragState.endMs);
			const hi = Math.max(this.dragState.startMs, this.dragState.endMs);
			const keyframes = this.#ctx.getKeyframes();
			const matching: number[] = [];
			for (let i = 0; i < keyframes.length; i++) {
				if (keyframes[i].time >= lo && keyframes[i].time <= hi) matching.push(i);
			}
			this.#ctx.setSelectedIndices(matching);
		}
		this.dragState = null;
	}

	onWheel(e: WheelEvent): void {
		if (!(e.ctrlKey || e.metaKey)) return;
		e.preventDefault();
		this.#ctx.onZoomChange(this.#ctx.getZoom() * (e.deltaY < 0 ? 1.25 : 0.8));
	}

	/** Helper used by markup to decide if a keyframe is in the current selection. */
	isSelected(idx: number): boolean {
		return this.#ctx.getSelectedIndices().includes(idx);
	}

	#selectOnly(idx: number): void {
		this.#ctx.setSelectedIndices([idx]);
	}

	#selectToggle(idx: number): void {
		const sel = this.#ctx.getSelectedIndices();
		this.#ctx.setSelectedIndices(
			sel.includes(idx)
				? sel.filter(i => i !== idx)
				: [...sel, idx].sort((a, b) => a - b),
		);
	}
}
