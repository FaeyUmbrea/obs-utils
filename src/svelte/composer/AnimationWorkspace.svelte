<svelte:options runes={true} />
<script lang='ts'>
	import type {
		AnimatablePropertyKey,
		EasingV2,
		PropertyKeyframe,
		TrackKeyframe,
	} from '../../utils/overlayAnimation.ts';
	import type { OverlayComponentData, OverlayData, OverlayTrack, TrackBehavior, TrackComponentLane } from '../../utils/types.ts';
	import { setContext, untrack } from 'svelte';
	import {
		DEFAULT_EASING_V2,
		ensureLane,
		insertPropertyKeyframe,
		interpPropertyKeyframes,
		lanePropertyKeyframes,
		makeEmptyAnimation,
		makeEmptyTrack,
		PROP_DEFAULTS,
		removeKeyframeOnLane,
		removePropertyKeyframe,
		updateKeyframeOnLane,
		updatePropertyKeyframe,
	} from '../../utils/overlayAnimation.ts';
	import { ensureComponentId, generateId } from '../../utils/types.ts';
	import KeyframeInspector from './KeyframeInspector.svelte';
	import KeyframeTimeline from './KeyframeTimeline.svelte';
	import LivePreview from './LivePreview.svelte';
	import TrackBar from './TrackBar.svelte';
	import TracksPane from './TracksPane.svelte';
	import TransitionsDrawer from './TransitionsDrawer.svelte';

	const { layer, commit }: {
		layer: OverlayData;
		commit: () => void;
	} = $props();

	type Selection
		= | { kind: 'component'; componentId: string }
			| { kind: 'property'; componentId: string; prop: AnimatablePropertyKey }
			| { kind: 'legacy-kf'; componentId: string; index: number }
			| { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number };

	let selectedTrackId = $state<string | null>(untrack(() => layer.animation?.initialTrackId ?? null));
	let playheadT = $state(0);
	let selection = $state<Selection | null>(null);
	let transitionsOpen = $state(false);
	let workspaceEl = $state<HTMLDivElement | null>(null);
	let lassoRect = $state<{ lx: number; ly: number; rx: number; ry: number } | null>(null);

	const selectedTrack = $derived(
		selectedTrackId
			? layer.animation?.tracks.find(t => t.id === selectedTrackId) ?? null
			: null,
	);

	function ensureAnimation(): void {
		if (layer.animation) return;
		const initialId = generateId();
		layer.animation = makeEmptyAnimation(initialId);
		commit();
	}

	function addTrack() {
		ensureAnimation();
		const id = generateId();
		const track = makeEmptyTrack(id, `Track ${layer.animation!.tracks.length + 1}`);
		track.behavior = { type: 'looping' };
		track.durationMs = 2000;
		layer.animation!.tracks = [...layer.animation!.tracks, track];
		selectedTrackId = id;
		commit();
	}

	async function requestRemoveTrack(id: string): Promise<void> {
		if (!layer.animation) return;
		if (layer.animation.tracks.length <= 1) {
			const proceed = await foundry.applications.api.DialogV2.confirm({
				content: game.i18n.localize('obs-utils.applications.overlayEditor.animation.confirmRemoveLastTrack')
					?? 'Removing the last track will delete this overlay’s animation entirely. Continue?',
			});
			if (!proceed) return;
		}
		removeTrack(id);
	}

	function removeTrack(id: string) {
		if (!layer.animation) return;
		if (layer.animation.tracks.length <= 1) {
			delete layer.animation;
			selectedTrackId = null;
			selection = null;
			commit();
			return;
		}
		layer.animation.tracks = layer.animation.tracks.filter(t => t.id !== id);
		if (layer.animation.initialTrackId === id) {
			layer.animation.initialTrackId = layer.animation.tracks[0].id;
		}
		layer.animation.transitions = layer.animation.transitions
			.filter(tr => tr.fromTrackId !== id)
			.map(tr => ({
				...tr,
				zones: tr.zones.map(z =>
					z.destination.type === 'goto' && z.destination.toTrackId === id
						? { ...z, destination: { type: 'ignore' as const } }
						: z,
				),
			}));
		if (selectedTrackId === id) {
			selectedTrackId = layer.animation.tracks[0]?.id ?? null;
		}
		commit();
	}

	function setBehavior(track: OverlayTrack, type: TrackBehavior['type']) {
		if (type === 'static') {
			track.behavior = { type: 'static' };
		} else if (type === 'looping') {
			track.behavior = { type: 'looping' };
		} else {
			const fallbackId = layer.animation?.tracks.find(t => t.id !== track.id)?.id ?? track.id;
			track.behavior = { type: 'transition-on-end', toTrackId: fallbackId, toTime: 0 };
		}
		commit();
	}

	function setDuration(track: OverlayTrack, ms: number) {
		track.durationMs = Math.max(0, ms);
		commit();
	}

	function setInitialTrack(id: string) {
		if (!layer.animation) return;
		layer.animation.initialTrackId = id;
		commit();
	}

	let isPlaying = $state(false);
	let playRafId: number | null = null;
	let playStartWall = 0;
	let playStartT = 0;

	function startPlayback() {
		if (!selectedTrack || selectedTrack.durationMs <= 0) return;
		playStartT = playheadT >= selectedTrack.durationMs ? 0 : playheadT;
		playStartWall = performance.now();
		isPlaying = true;
		const tick = () => {
			if (!isPlaying || !selectedTrack) {
				playRafId = null;
				return;
			}
			const elapsed = performance.now() - playStartWall;
			const dur = selectedTrack.durationMs;
			const raw = playStartT + elapsed;
			if (selectedTrack.behavior.type === 'looping') {
				playheadT = dur > 0 ? raw % dur : 0;
			} else if (raw >= dur) {
				playheadT = dur;
				isPlaying = false;
				playRafId = null;
				return;
			} else {
				playheadT = raw;
			}
			playRafId = requestAnimationFrame(tick);
		};
		playRafId = requestAnimationFrame(tick);
	}

	function stopPlayback() {
		isPlaying = false;
		if (playRafId !== null) {
			cancelAnimationFrame(playRafId);
			playRafId = null;
		}
	}

	function clampPlayhead() {
		if (!selectedTrack) return;
		if (playheadT > selectedTrack.durationMs) playheadT = selectedTrack.durationMs;
		if (playheadT < 0) playheadT = 0;
	}

	function componentBase(comp: OverlayComponentData | undefined, prop: AnimatablePropertyKey): number {
		if (!comp) return 0;
		if (prop === 'x') return comp.x ?? 0;
		if (prop === 'y') return comp.y ?? 0;
		if (prop === 'rotation') return comp.rotation ?? 0;
		return 0;
	}

	function valueAt(componentId: string, prop: AnimatablePropertyKey): number {
		const comp = (layer.components ?? []).find(c => ensureComponentId(c) === componentId);
		const base = componentBase(comp, prop);
		if (!selectedTrack) {
			return prop === 'opacity' ? PROP_DEFAULTS.opacity : base;
		}
		const lane = selectedTrack.lanes.find(l => l.componentId === componentId);
		if (!lane) {
			return prop === 'opacity' ? PROP_DEFAULTS.opacity : base;
		}
		const arr = lanePropertyKeyframes(lane)[prop] ?? [];
		const delta = interpPropertyKeyframes(arr, prop, Math.round(playheadT));
		if (prop === 'x' || prop === 'y' || prop === 'rotation') return base + delta;
		return delta;
	}

	function setPropertyValueAtPlayhead(componentId: string, prop: AnimatablePropertyKey, value: number) {
		if (!selectedTrack) return;
		const comp = (layer.components ?? []).find(c => ensureComponentId(c) === componentId);
		const base = componentBase(comp, prop);
		const stored = (prop === 'x' || prop === 'y' || prop === 'rotation') ? value - base : value;
		const lane = ensureLane(selectedTrack, componentId);
		const arr = lanePropertyKeyframes(lane)[prop] ?? [];
		const t = Math.round(playheadT);
		const existing = arr.findIndex(k => k.t === t);
		if (existing >= 0) {
			const persisted = lane.propertyKeyframes?.[prop] ?? [];
			const storedIdx = persisted.findIndex(k => k.t === t);
			if (storedIdx >= 0) {
				updatePropertyKeyframe(lane, prop, storedIdx, { v: stored });
			} else {
				insertPropertyKeyframe(lane, prop, { t, v: stored, easing: { ...DEFAULT_EASING_V2 } });
			}
		} else {
			insertPropertyKeyframe(lane, prop, { t, v: stored, easing: { ...DEFAULT_EASING_V2 } });
		}
		commit();
	}

	function togglePropertyKeyframe(componentId: string, prop: AnimatablePropertyKey, currentValue: number) {
		if (!selectedTrack) return;
		const lane = ensureLane(selectedTrack, componentId);
		const pkf = lanePropertyKeyframes(lane);
		const arr = pkf[prop];
		const existingIdx = arr.findIndex(k => k.t === Math.round(playheadT));
		if (existingIdx >= 0) {
			removePropertyKeyframe(lane, prop, existingIdx);
			selection = { kind: 'component', componentId };
		} else {
			const comp = (layer.components ?? []).find(c => ensureComponentId(c) === componentId);
			const base = componentBase(comp, prop);
			const stored = (prop === 'x' || prop === 'y' || prop === 'rotation') ? currentValue - base : currentValue;
			const idx = insertPropertyKeyframe(lane, prop, {
				t: Math.round(playheadT),
				v: stored,
				easing: { ...DEFAULT_EASING_V2 },
			});
			selection = { kind: 'prop-kf', componentId, prop, index: idx };
		}
		commit();
	}

	function chevronStateFor(componentId: string, prop: AnimatablePropertyKey): 'none' | 'between' | 'on' {
		if (!selectedTrack) return 'none';
		const lane = selectedTrack.lanes.find(l => l.componentId === componentId);
		if (!lane) return 'none';
		const arr = lanePropertyKeyframes(lane)[prop];
		if (arr.length === 0) return 'none';
		const onKf = arr.some(k => k.t === Math.round(playheadT));
		return onKf ? 'on' : 'between';
	}

	setContext('obs-utils.animWorkspace', {
		get playheadT() { return playheadT; },
		togglePropertyKeyframe,
		chevronStateFor,
	});

	const selectedPropKfRef = $derived.by<{ lane: TrackComponentLane; prop: AnimatablePropertyKey; kf: PropertyKeyframe; index: number } | null>(() => {
		if (!selection || selection.kind !== 'prop-kf' || !selectedTrack) return null;
		const sel = selection;
		const lane = selectedTrack.lanes.find(l => l.componentId === sel.componentId);
		if (!lane?.propertyKeyframes) return null;
		const arr = lane.propertyKeyframes[sel.prop];
		const kf = arr?.[sel.index];
		if (!kf) return null;
		return { lane, prop: sel.prop, kf, index: sel.index };
	});

	const selectedLegacyKfRef = $derived.by<{ lane: TrackComponentLane; kf: TrackKeyframe; index: number } | null>(() => {
		if (!selection || selection.kind !== 'legacy-kf' || !selectedTrack) return null;
		const sel = selection;
		const lane = selectedTrack.lanes.find(l => l.componentId === sel.componentId);
		const kf = lane?.keyframes[sel.index];
		return kf ? { lane: lane!, kf, index: sel.index } : null;
	});

	function patchLegacyKfField(field: keyof TrackKeyframe, value: number) {
		if (selection?.kind !== 'legacy-kf' || !selectedLegacyKfRef) return;
		const sel = selection;
		const newIdx = updateKeyframeOnLane(selectedLegacyKfRef.lane, sel.index, { [field]: value });
		if (newIdx >= 0) selection = { kind: 'legacy-kf', componentId: sel.componentId, index: newIdx };
		commit();
	}

	function deleteLegacyKeyframe() {
		if (selection?.kind !== 'legacy-kf' || !selectedLegacyKfRef) return;
		const componentId = selectedLegacyKfRef.lane.componentId;
		removeKeyframeOnLane(selectedLegacyKfRef.lane, selectedLegacyKfRef.index);
		selection = { kind: 'component', componentId };
		commit();
	}

	function patchPropKfTime(t: number) {
		if (selection?.kind !== 'prop-kf' || !selectedPropKfRef) return;
		const sel = selection;
		const newIdx = updatePropertyKeyframe(selectedPropKfRef.lane, sel.prop, sel.index, { t: Math.round(t) });
		if (newIdx >= 0) selection = { ...sel, index: newIdx };
		commit();
	}

	function patchPropKfEasing(patch: Partial<EasingV2>) {
		if (selection?.kind !== 'prop-kf' || !selectedPropKfRef) return;
		const sel = selection;
		const current = selectedPropKfRef.kf.easing ?? { ...DEFAULT_EASING_V2 };
		const next: EasingV2 = { ...current, ...patch };
		const newIdx = updatePropertyKeyframe(selectedPropKfRef.lane, sel.prop, sel.index, { easing: next });
		if (newIdx >= 0) selection = { ...sel, index: newIdx };
		commit();
	}

	let timelineRef = $state<KeyframeTimeline | null>(null);

	function stepFrame(direction: 1 | -1) {
		timelineRef?.stepFrame(direction);
	}
	function jumpKeyframe(direction: 1 | -1, toEdge: boolean) {
		timelineRef?.jumpKeyframe(direction, toEdge);
	}

	const transitionsForCurrentTrackCount = $derived.by(() => {
		if (!layer.animation || !selectedTrack) return 0;
		return layer.animation.transitions.filter(tr => tr.fromTrackId === selectedTrack.id).length
			+ (selectedTrack.behavior.type === 'transition-on-end' ? 1 : 0);
	});

	$effect(() => {
		void selectedTrackId;
		playheadT = 0;
		selection = null;
	});

	$effect(() => {
		clampPlayhead();
	});
</script>

<div class='anim-workspace' bind:this={workspaceEl}>
	{#if !layer.animation}
		<div class='no-anim'>
			<i class='fas fa-film'></i>
			<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.intro')}</p>
			<button type='button' class='primary-btn' onclick={ensureAnimation}>
				{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.start')}
			</button>
		</div>
	{:else}
		<TracksPane
			tracks={layer.animation.tracks}
			{selectedTrackId}
			initialTrackId={layer.animation.initialTrackId}
			canRemoveStandalone={layer.animation.tracks.length > 1}
			onSelect={id => (selectedTrackId = id)}
			onAdd={addTrack}
			onRemove={requestRemoveTrack}
		/>

		<section class='center-col'>
			{#if selectedTrack}
				<TrackBar
					track={selectedTrack}
					isInitial={layer.animation.initialTrackId === selectedTrack.id}
					{isPlaying}
					{playheadT}
					transitionsCount={transitionsForCurrentTrackCount}
					canTransition={layer.animation.tracks.length >= 2}
					{transitionsOpen}
					onRename={(name) => {
						selectedTrack.name = name;
						commit();
					}}
					onBehavior={t => setBehavior(selectedTrack, t)}
					onDuration={ms => setDuration(selectedTrack, ms)}
					onInitial={() => setInitialTrack(selectedTrack.id)}
					onPlay={startPlayback}
					onStop={stopPlayback}
					onStepFrame={stepFrame}
					onJumpKeyframe={jumpKeyframe}
					onSetPlayhead={t => (playheadT = t)}
					onToggleTransitions={() => (transitionsOpen = !transitionsOpen)}
				/>

				<KeyframeTimeline
					bind:this={timelineRef}
					{layer}
					track={selectedTrack}
					bind:playheadT
					bind:selection
					{commit}
					onSetWorkspaceLasso={r => (lassoRect = r)}
					{valueAt}
					{componentBase}
				/>
			{:else}
				<div class='empty-detail'>
					<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.selectTrack')}</p>
				</div>
			{/if}
		</section>

		<aside class='right-col'>
			<LivePreview {layer} track={selectedTrack} {playheadT} />
			{#if selectedTrack}
				<KeyframeInspector
					{layer}
					track={selectedTrack}
					{playheadT}
					{selection}
					{selectedPropKfRef}
					{selectedLegacyKfRef}
					{valueAt}
					{setPropertyValueAtPlayhead}
					{togglePropertyKeyframe}
					{patchPropKfTime}
					{patchPropKfEasing}
					{patchLegacyKfField}
					{deleteLegacyKeyframe}
					onSelectProperty={sel => (selection = sel)}
				/>
			{:else}
				<div class='kf-inspector kf-inspector-empty'>
					<div class='kf-empty'>
						<i class='fas fa-mouse-pointer'></i>
						<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.kfSelectHint')}</p>
					</div>
				</div>
			{/if}
		</aside>

		{#if selectedTrack}
			<TransitionsDrawer bind:open={transitionsOpen} {layer} {selectedTrack} {commit} />
		{/if}
	{/if}

	{#if lassoRect && workspaceEl}
		{@const wr = workspaceEl.getBoundingClientRect()}
		<div
			class='lasso-rect'
			style={`left: ${lassoRect.lx - wr.left}px; top: ${lassoRect.ly - wr.top}px; width: ${Math.max(1, lassoRect.rx - lassoRect.lx)}px; height: ${Math.max(1, lassoRect.ry - lassoRect.ly)}px;`}
		></div>
	{/if}
</div>

<style lang='stylus'>
	.anim-workspace
		display grid
		grid-template-columns 180px minmax(0, 1fr) 320px
		gap 6px
		flex 1 1 auto
		padding 6px
		min-height 0
		overflow hidden
		position relative

	.no-anim
		grid-column 1 / -1
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 12px
		opacity 0.7

		i
			font-size 36px
			opacity 0.5

		p
			margin 0
			font-size 13px
			max-width 320px
			text-align center
			line-height 1.5

		.primary-btn
			height 32px
			padding 0 16px
			background rgba(255, 144, 0, 0.18)
			border 1px solid rgba(255, 144, 0, 0.5)
			border-radius 4px
			cursor pointer
			font-size 13px

			&:hover
				background rgba(255, 144, 0, 0.28)

	.center-col
		display flex
		flex-direction column
		min-height 0
		background rgba(0, 0, 0, 0.18)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 8px
		gap 8px
		overflow hidden

	.right-col
		display flex
		flex-direction column
		min-height 0
		min-width 0
		gap 6px

	.kf-inspector-empty
		flex 1 1 auto
		min-height 0
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 8px

	.kf-empty
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 8px
		height 100%
		min-height 100px
		opacity 0.5
		font-size 12px

		i
			font-size 20px

	.empty-detail
		padding 24px
		text-align center
		font-size 12px
		opacity 0.6

	.lasso-rect
		position absolute
		background rgba(120, 200, 255, 0.15)
		border 1.5px dashed rgba(120, 200, 255, 0.85)
		pointer-events none
		z-index 9999
</style>
