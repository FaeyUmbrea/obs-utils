<svelte:options runes={true} />
<script lang='ts'>
	import type { DragTarget, KfRef, Selection } from '../../utils/keyframeTimelineRefs.ts';
	import type { AnimatablePropertyKey } from '../../utils/overlayAnimation.ts';
	import type { OverlayData, OverlayTrack } from '../../utils/types.ts';
	import { onDestroy, onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		kfRefId,
		kfRefTime,
		parseKfRef,
		TIMELINE_INSET,
		tToX,
		USER_ANIMATABLE_PROPERTIES,
		xToT,
	} from '../../utils/keyframeTimelineRefs.ts';
	import {
		ANIMATABLE_PROPERTIES,
		laneAggregateTimes,
		lanePropertyKeyframes,
		removeKeyframeOnLane,
		removePropertyKeyframe,
		updateKeyframeOnLane,
		updatePropertyKeyframe,
	} from '../../utils/overlayAnimation.ts';
	import { ensureComponentId } from '../../utils/types.ts';
	import KeyframeMarker from './KeyframeMarker.svelte';

	let {
		layer,
		track,
		selection = $bindable(),
		playheadT = $bindable(),
		expandedComponents,
		commit,
		onSetWorkspaceLasso,
	}: {
		layer: OverlayData;
		track: OverlayTrack;
		selection: Selection | null;
		playheadT: number;
		expandedComponents: SvelteSet<string>;
		commit: () => void;
		onSetWorkspaceLasso: (lasso: { lx: number; ly: number; rx: number; ry: number } | null) => void;
	} = $props();

	let timelineEl = $state<HTMLDivElement | null>(null);
	let multiSelection = $state<KfRef[]>([]);

	let scrubbing = $state(false);
	let scrubStartX = 0;
	let scrubStartT = 0;

	let dragging = $state<DragTarget | null>(null);

	function timelineWidth(): number {
		return timelineEl?.clientWidth ?? 600;
	}

	function timelineInner(): number {
		return Math.max(1, timelineWidth() - TIMELINE_INSET * 2);
	}

	function snapToPlayhead(candidateMs: number): number {
		const w = timelineInner();
		if (w <= 0) return candidateMs;
		const pxPerMs = w / Math.max(1, track.durationMs);
		const snapPx = 6;
		const snapMs = snapPx / pxPerMs;
		if (Math.abs(candidateMs - playheadT) <= snapMs) return Math.round(playheadT);
		return candidateMs;
	}

	function isInMultiSelection(ref: KfRef): boolean {
		const id = kfRefId(ref);
		return multiSelection.some(r => kfRefId(r) === id);
	}

	function onTimelineMouseDown(e: MouseEvent) {
		if (!timelineEl) return;
		const target = e.target as HTMLElement;
		if (target.closest('.kf-marker')) return;
		const r = timelineEl.getBoundingClientRect();
		const newT = Math.round(xToT(e.clientX - r.left, track.durationMs, timelineInner()));
		if (e.ctrlKey || e.metaKey) {
			dragging = { kind: 'lasso', startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY };
			pushLassoRect();
			e.preventDefault();
			return;
		}
		playheadT = newT;
		if (selection?.kind === 'prop-kf') {
			selection = { kind: 'property', componentId: selection.componentId, prop: selection.prop };
		} else if (selection?.kind === 'legacy-kf') {
			selection = { kind: 'component', componentId: selection.componentId };
		}
		multiSelection = [];
		scrubbing = true;
		scrubStartX = e.clientX;
		scrubStartT = newT;
		e.preventDefault();
	}

	function startMultiDragFromRef(e: MouseEvent, anchor: KfRef): boolean {
		if (!isInMultiSelection(anchor)) return false;
		const refs: Array<KfRef & { startT: number }> = [];
		for (const ref of multiSelection) {
			const t = kfRefTime(track, ref);
			if (t === null) continue;
			refs.push({ ...ref, startT: t });
		}
		dragging = { kind: 'multi', startX: e.clientX, refs };
		return true;
	}

	function startLegacyKfDrag(e: MouseEvent, componentId: string, index: number) {
		e.preventDefault();
		e.stopPropagation();
		const anchor: KfRef = { kind: 'legacy', componentId, index };
		if (startMultiDragFromRef(e, anchor)) return;
		const lane = track.lanes.find(l => l.componentId === componentId);
		const kf = lane?.keyframes[index];
		if (!kf) return;
		multiSelection = [];
		selection = { kind: 'legacy-kf', componentId, index };
		dragging = { kind: 'legacy', componentId, index, startX: e.clientX, startT: kf.t };
	}

	function startPropKfDrag(e: MouseEvent, componentId: string, prop: AnimatablePropertyKey, index: number) {
		e.preventDefault();
		e.stopPropagation();
		const anchor: KfRef = { kind: 'prop', componentId, prop, index };
		if (startMultiDragFromRef(e, anchor)) return;
		const lane = track.lanes.find(l => l.componentId === componentId);
		const arr = lane?.propertyKeyframes?.[prop];
		const kf = arr?.[index];
		if (!kf) return;
		multiSelection = [];
		selection = { kind: 'prop-kf', componentId, prop, index };
		dragging = { kind: 'prop', componentId, prop, index, startX: e.clientX, startT: kf.t };
	}

	function startAggregateDrag(e: MouseEvent, componentId: string, t: number) {
		e.preventDefault();
		e.stopPropagation();
		const lane = track.lanes.find(l => l.componentId === componentId);
		if (!lane) return;
		dragging = { kind: 'aggregate', componentId, times: [t], startX: e.clientX, startBaseT: t };
	}

	function onWindowMouseMove(e: MouseEvent) {
		if (scrubbing) {
			const dx = e.clientX - scrubStartX;
			const dMs = (dx / timelineInner()) * track.durationMs;
			playheadT = Math.max(0, Math.min(track.durationMs, Math.round(scrubStartT + dMs)));
			return;
		}
		if (!dragging) return;

		const dx = e.clientX - dragging.startX;
		const dMs = Math.round((dx / timelineInner()) * track.durationMs);

		if (dragging.kind === 'lasso') {
			dragging = { ...dragging, endX: e.clientX, endY: e.clientY };
			pushLassoRect();
			return;
		}

		if (dragging.kind === 'multi') {
			for (const ref of dragging.refs) {
				const lane = track.lanes.find(l => l.componentId === ref.componentId);
				if (!lane) continue;
				const raw = Math.max(0, Math.min(track.durationMs, ref.startT + dMs));
				const newT = snapToPlayhead(raw);
				if (ref.kind === 'legacy') {
					const newIdx = updateKeyframeOnLane(lane, ref.index, { t: newT });
					ref.index = newIdx;
				} else {
					const newIdx = updatePropertyKeyframe(lane, ref.prop, ref.index, { t: newT });
					ref.index = newIdx;
				}
			}
			commit();
			return;
		}

		if (dragging.kind === 'legacy') {
			const lane = track.lanes.find(l => l.componentId === dragging.componentId);
			if (!lane) return;
			const raw = Math.max(0, Math.min(track.durationMs, dragging.startT + dMs));
			const newT = snapToPlayhead(raw);
			const newIdx = updateKeyframeOnLane(lane, dragging.index, { t: newT });
			dragging.index = newIdx;
			selection = { kind: 'legacy-kf', componentId: dragging.componentId, index: newIdx };
			commit();
		} else if (dragging.kind === 'prop') {
			const lane = track.lanes.find(l => l.componentId === dragging.componentId);
			if (!lane) return;
			const raw = Math.max(0, Math.min(track.durationMs, dragging.startT + dMs));
			const newT = snapToPlayhead(raw);
			const newIdx = updatePropertyKeyframe(lane, dragging.prop, dragging.index, { t: newT });
			dragging.index = newIdx;
			selection = { kind: 'prop-kf', componentId: dragging.componentId, prop: dragging.prop, index: newIdx };
			commit();
		} else if (dragging.kind === 'aggregate') {
			const lane = track.lanes.find(l => l.componentId === dragging.componentId);
			if (!lane) return;
			const origT = dragging.startBaseT;
			const raw = Math.max(0, Math.min(track.durationMs, origT + dMs));
			const newT = snapToPlayhead(raw);
			const actualDelta = newT - origT;
			if (actualDelta === 0) return;

			for (let i = 0; i < lane.keyframes.length; i++) {
				if (lane.keyframes[i].t === origT) {
					updateKeyframeOnLane(lane, i, { t: Math.max(0, Math.min(track.durationMs, origT + actualDelta)) });
				}
			}
			if (lane.propertyKeyframes) {
				for (const prop of ANIMATABLE_PROPERTIES) {
					const arr = lane.propertyKeyframes[prop];
					if (!arr) continue;
					for (let i = 0; i < arr.length; i++) {
						if (arr[i].t === origT) {
							updatePropertyKeyframe(lane, prop, i, { t: Math.max(0, Math.min(track.durationMs, origT + actualDelta)) });
						}
					}
				}
			}
			dragging.startBaseT = newT;
			dragging.startX = e.clientX;
			commit();
		}
	}

	function pushLassoRect() {
		if (dragging?.kind !== 'lasso') {
			onSetWorkspaceLasso(null);
			return;
		}
		const lx = Math.min(dragging.startX, dragging.endX);
		const ly = Math.min(dragging.startY, dragging.endY);
		const rx = Math.max(dragging.startX, dragging.endX);
		const ry = Math.max(dragging.startY, dragging.endY);
		onSetWorkspaceLasso({ lx, ly, rx, ry });
	}

	function onWindowMouseUp() {
		if (dragging?.kind === 'lasso' && timelineEl) {
			const lx = Math.min(dragging.startX, dragging.endX);
			const ly = Math.min(dragging.startY, dragging.endY);
			const rx = Math.max(dragging.startX, dragging.endX);
			const ry = Math.max(dragging.startY, dragging.endY);
			const hits: KfRef[] = [];
			const markers = timelineEl.querySelectorAll<HTMLElement>('.kf-marker[data-kf-ref]');
			for (const m of markers) {
				const r = m.getBoundingClientRect();
				if (r.right < lx || r.left > rx || r.bottom < ly || r.top > ry) continue;
				const ref = parseKfRef(m.dataset.kfRef ?? '');
				if (ref) hits.push(ref);
			}
			multiSelection = hits;
		}
		dragging = null;
		scrubbing = false;
		onSetWorkspaceLasso(null);
	}

	function deleteLegacyKeyframe() {
		if (selection?.kind !== 'legacy-kf') return;
		const sel = selection;
		const lane = track.lanes.find(l => l.componentId === sel.componentId);
		if (!lane) return;
		removeKeyframeOnLane(lane, sel.index);
		selection = { kind: 'component', componentId: sel.componentId };
		commit();
	}

	function deletePropKeyframe() {
		if (selection?.kind !== 'prop-kf') return;
		const sel = selection;
		const lane = track.lanes.find(l => l.componentId === sel.componentId);
		if (!lane) return;
		removePropertyKeyframe(lane, sel.prop, sel.index);
		selection = { kind: 'component', componentId: sel.componentId };
		commit();
	}

	function deleteMultiSelection() {
		if (multiSelection.length === 0) return;
		const sorted = [...multiSelection].sort((a, b) => b.index - a.index);
		for (const ref of sorted) {
			const lane = track.lanes.find(l => l.componentId === ref.componentId);
			if (!lane) continue;
			if (ref.kind === 'legacy') {
				removeKeyframeOnLane(lane, ref.index);
			} else {
				removePropertyKeyframe(lane, ref.prop, ref.index);
			}
		}
		multiSelection = [];
		commit();
	}

	function nudgeSelectedKeyframe(deltaMs: number) {
		if (selection?.kind === 'prop-kf') {
			const sel = selection;
			const lane = track.lanes.find(l => l.componentId === sel.componentId);
			const kf = lane?.propertyKeyframes?.[sel.prop]?.[sel.index];
			if (!lane || !kf) return;
			const newT = Math.max(0, Math.min(track.durationMs, kf.t + deltaMs));
			const newIdx = updatePropertyKeyframe(lane, sel.prop, sel.index, { t: newT });
			if (newIdx >= 0) selection = { kind: 'prop-kf', componentId: sel.componentId, prop: sel.prop, index: newIdx };
			playheadT = newT;
			commit();
		} else if (selection?.kind === 'legacy-kf') {
			const sel = selection;
			const lane = track.lanes.find(l => l.componentId === sel.componentId);
			const kf = lane?.keyframes[sel.index];
			if (!lane || !kf) return;
			const newT = Math.max(0, Math.min(track.durationMs, kf.t + deltaMs));
			const newIdx = updateKeyframeOnLane(lane, sel.index, { t: newT });
			if (newIdx >= 0) selection = { kind: 'legacy-kf', componentId: sel.componentId, index: newIdx };
			playheadT = newT;
			commit();
		}
	}

	function onWindowKeyCapture(e: KeyboardEvent) {
		const t = e.target as HTMLElement | null;
		const tag = t?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;

		if (e.key === 'Backspace' || e.key === 'Delete') {
			if (multiSelection.length > 0) {
				e.preventDefault();
				e.stopImmediatePropagation();
				deleteMultiSelection();
			} else if (selection?.kind === 'prop-kf') {
				e.preventDefault();
				e.stopImmediatePropagation();
				deletePropKeyframe();
			} else if (selection?.kind === 'legacy-kf') {
				e.preventDefault();
				e.stopImmediatePropagation();
				deleteLegacyKeyframe();
			}
			return;
		}

		if ((selection?.kind === 'prop-kf' || selection?.kind === 'legacy-kf')
			&& (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
			const step = e.shiftKey ? 100 : e.ctrlKey || e.metaKey ? 10 : 1;
			const dir = e.key === 'ArrowLeft' ? -1 : 1;
			e.preventDefault();
			e.stopImmediatePropagation();
			nudgeSelectedKeyframe(step * dir);
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onWindowKeyCapture, { capture: true });
	});
	onDestroy(() => {
		window.removeEventListener('keydown', onWindowKeyCapture, { capture: true });
	});
</script>

<svelte:window onmousemove={onWindowMouseMove} onmouseup={onWindowMouseUp} />

<div
	class='lane-strips'
	bind:this={timelineEl}
	onmousedown={onTimelineMouseDown}
	role='presentation'
>
	{#each layer.components ?? [] as comp (comp.id ?? (layer.components ?? []).indexOf(comp))}
		{@const componentId = ensureComponentId(comp)}
		{@const isExpanded = expandedComponents.has(componentId)}
		{@const lane = track.lanes.find(l => l.componentId === componentId)}
		{@const aggTimes = lane ? laneAggregateTimes(lane) : []}

		<div class='lane-strip comp-strip'>
			{#each aggTimes as t (t)}
				<KeyframeMarker
					variant='aggregate'
					leftPx={tToX(t, track.durationMs, Math.max(1, (timelineEl?.clientWidth ?? 600) - TIMELINE_INSET * 2))}
					selected={false}
					multiSelected={false}
					ariaLabel={`Aggregate keyframe at ${t}ms`}
					onMousedown={e => startAggregateDrag(e, componentId, t)}
					onClick={(e) => {
						e.stopPropagation();
						selection = { kind: 'component', componentId };
					}}
					onKeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							selection = { kind: 'component', componentId };
						}
					}}
				/>
			{/each}

			{#if lane}
				{#each lane.keyframes as kf, idx (`${idx}-${kf.t}`)}
					<KeyframeMarker
						variant='legacy'
						leftPx={tToX(kf.t, track.durationMs, Math.max(1, (timelineEl?.clientWidth ?? 600) - TIMELINE_INSET * 2))}
						selected={selection?.kind === 'legacy-kf' && selection.componentId === componentId && selection.index === idx}
						multiSelected={isInMultiSelection({ kind: 'legacy', componentId, index: idx })}
						dataKfRef={`legacy:${componentId}:${idx}`}
						ariaLabel={`Keyframe at ${kf.t}ms`}
						onMousedown={e => startLegacyKfDrag(e, componentId, idx)}
						onClick={(e) => {
							e.stopPropagation();
							playheadT = kf.t;
							if (!isInMultiSelection({ kind: 'legacy', componentId, index: idx })) {
								multiSelection = [];
							}
							selection = { kind: 'legacy-kf', componentId, index: idx };
						}}
						onKeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								playheadT = kf.t;
								selection = { kind: 'legacy-kf', componentId, index: idx };
							}
						}}
					/>
				{/each}
			{/if}
		</div>

		{#if isExpanded}
			{#each USER_ANIMATABLE_PROPERTIES as prop (prop)}
				{@const pkf = lane ? (lanePropertyKeyframes(lane)[prop] ?? []) : []}
				<div class='lane-strip prop-strip'>
					{#each pkf as kf, idx (`${idx}-${kf.t}`)}
						<KeyframeMarker
							variant='prop'
							leftPx={tToX(kf.t, track.durationMs, Math.max(1, (timelineEl?.clientWidth ?? 600) - TIMELINE_INSET * 2))}
							easing={kf.easing}
							selected={selection?.kind === 'prop-kf' && selection.componentId === componentId && selection.prop === prop && selection.index === idx}
							multiSelected={isInMultiSelection({ kind: 'prop', componentId, prop, index: idx })}
							dataKfRef={`prop:${componentId}:${prop}:${idx}`}
							ariaLabel={`${prop} keyframe at ${kf.t}ms`}
							onMousedown={e => startPropKfDrag(e, componentId, prop, idx)}
							onClick={(e) => {
								e.stopPropagation();
								playheadT = kf.t;
								if (!isInMultiSelection({ kind: 'prop', componentId, prop, index: idx })) {
									multiSelection = [];
								}
								selection = { kind: 'prop-kf', componentId, prop, index: idx };
							}}
							onKeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									playheadT = kf.t;
									selection = { kind: 'prop-kf', componentId, prop, index: idx };
								}
							}}
						/>
					{/each}
				</div>
			{/each}
		{/if}
	{/each}

	<div class='playhead' style={`left: ${tToX(playheadT, track.durationMs, Math.max(1, (timelineEl?.clientWidth ?? 600) - TIMELINE_INSET * 2))}px;`}></div>
</div>

<style lang='stylus'>
	.lane-strips
		position relative
		display flex
		flex-direction column
		gap 2px
		cursor crosshair

	.lane-strip
		position relative
		height 20px
		background rgba(255, 255, 255, 0.04)
		border-radius 3px

		&.comp-strip
			background rgba(255, 255, 255, 0.06)
			margin-top 2px
			border-top 1px solid rgba(255, 255, 255, 0.06)

		&.prop-strip
			background rgba(255, 255, 255, 0.03)

	.playhead
		position absolute
		top 0
		bottom 0
		width 1.5px
		background rgba(255, 255, 255, 0.65)
		pointer-events none
		margin-left -0.75px
</style>
