<svelte:options runes={true} />
<script lang='ts'>
	import type { Selection } from '../../utils/keyframeTimelineRefs.ts';
	import type { AnimatablePropertyKey } from '../../utils/overlayAnimation.ts';
	import type { OverlayComponentData, OverlayData, OverlayTrack } from '../../utils/types.ts';
	import { SvelteSet } from 'svelte/reactivity';
	import { getApi } from '../../utils/helpers.ts';
	import { STEP_MS, USER_ANIMATABLE_PROPERTIES } from '../../utils/keyframeTimelineRefs.ts';
	import {
		ANIMATABLE_PROPERTIES,
		DEFAULT_EASING_V2,
		ensureLane,
		insertPropertyKeyframe,
		lanePropertyKeyframes,
	} from '../../utils/overlayAnimation.ts';
	import { ensureComponentId } from '../../utils/types.ts';
	import KeyframeLaneHeads from './KeyframeLaneHeads.svelte';
	import KeyframeLaneStrips from './KeyframeLaneStrips.svelte';

	let {
		layer,
		track,
		playheadT = $bindable(),
		selection = $bindable(),
		commit,
		onSetWorkspaceLasso,
		valueAt,
		componentBase,
	}: {
		layer: OverlayData;
		track: OverlayTrack;
		playheadT: number;
		selection: Selection | null;
		commit: () => void;
		onSetWorkspaceLasso: (lasso: { lx: number; ly: number; rx: number; ry: number } | null) => void;
		valueAt: (componentId: string, prop: AnimatablePropertyKey) => number;
		componentBase: (comp: OverlayComponentData | undefined, prop: AnimatablePropertyKey) => number;
	} = $props();

	const expandedComponents = new SvelteSet<string>();

	function componentLabel(c: OverlayComponentData): string {
		const entry = getApi().overlayTypes.get(layer.type);
		const nameKey = entry?.overlayComponentNames?.get(c.type);
		const typeLabel = nameKey ? (game.i18n?.localize(nameKey) ?? c.type) : c.type;
		return `${typeLabel} #${(layer.components ?? []).indexOf(c) + 1}`;
	}

	function addKeyframeAtPlayhead(c: OverlayComponentData) {
		const componentId = ensureComponentId(c);
		const lane = ensureLane(track, componentId);
		const t = Math.round(playheadT);
		for (const prop of USER_ANIMATABLE_PROPERTIES) {
			const arr = lanePropertyKeyframes(lane)[prop] ?? [];
			if (arr.some(k => k.t === t)) continue;
			const v = valueAt(componentId, prop) - componentBase(c, prop);
			insertPropertyKeyframe(lane, prop, { t, v, easing: { ...DEFAULT_EASING_V2 } });
		}
		commit();
	}

	export function stepFrame(direction: 1 | -1) {
		playheadT = Math.max(0, Math.min(track.durationMs, Math.round(playheadT + direction * STEP_MS)));
	}

	const uniqueKfTimes = $derived.by(() => {
		const set = new SvelteSet<number>();
		for (const lane of track.lanes) {
			for (const kf of lane.keyframes) set.add(kf.t);
			if (lane.propertyKeyframes) {
				for (const prop of ANIMATABLE_PROPERTIES) {
					for (const kf of lane.propertyKeyframes[prop] ?? []) set.add(kf.t);
				}
			}
		}
		return [...set].sort((a, b) => a - b);
	});

	export function jumpKeyframe(direction: 1 | -1, toEdge = false) {
		if (uniqueKfTimes.length === 0) {
			playheadT = direction > 0 ? track.durationMs : 0;
			return;
		}
		if (toEdge) {
			playheadT = direction > 0 ? uniqueKfTimes[uniqueKfTimes.length - 1] : uniqueKfTimes[0];
			return;
		}
		if (direction > 0) {
			const next = uniqueKfTimes.find(t => t > playheadT + 1);
			playheadT = next ?? track.durationMs;
		} else {
			let prev: number | undefined;
			for (const t of uniqueKfTimes) {
				if (t < playheadT - 1) prev = t;
				else break;
			}
			playheadT = prev ?? 0;
		}
	}
</script>

<div class='lanes-frame'>
	<KeyframeLaneHeads
		{layer}
		{track}
		bind:selection
		{expandedComponents}
		onAddKeyframeAtPlayhead={addKeyframeAtPlayhead}
		{componentLabel}
	/>
	<KeyframeLaneStrips
		{layer}
		{track}
		bind:selection
		bind:playheadT
		{expandedComponents}
		{commit}
		{onSetWorkspaceLasso}
	/>
</div>

<style lang='stylus'>
	.lanes-frame
		display grid
		grid-template-columns 140px minmax(0, 1fr)
		gap 8px
		padding 8px
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		user-select none
		min-height 80px
		overflow-y auto
		flex 1 1 auto
</style>
