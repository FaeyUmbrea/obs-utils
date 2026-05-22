<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData, OverlayTrack } from '../../utils/types.ts';
	import { onDestroy, onMount } from 'svelte';
	import { getApi } from '../../utils/helpers.ts';
	import { computeTrackFrame } from '../../utils/overlayAnimation.ts';
	import { buildPreviewOverlay } from '../../utils/render.ts';
	import { settings } from '../../utils/settings.ts';

	const { layer, track, playheadT }: {
		layer: OverlayData;
		track: OverlayTrack | null;
		playheadT: number;
	} = $props();

	const PREVIEW_FRAME_W = 300;
	const PREVIEW_FRAME_H = 180;

	const actorIDsStore = settings.getReadableStore('overlayActors');
	const previewActorIDs = $derived(($actorIDsStore ?? []).slice(0, 1));

	let actorDataTick = $state(0);
	let actorUpdateHookId = 0;

	onMount(() => {
		actorUpdateHookId = Hooks.on('updateActor' as never, () => {
			actorDataTick = actorDataTick + 1;
		});
	});
	onDestroy(() => {
		if (actorUpdateHookId) Hooks.off('updateActor' as never, actorUpdateHookId);
	});

	const previewScale = $derived.by(() => {
		const w = layer.config?.w ?? 300;
		const h = layer.config?.h ?? 300;
		if (w <= 0 || h <= 0) return 1;
		return Math.min(PREVIEW_FRAME_W / w, PREVIEW_FRAME_H / h, 1);
	});

	const previewActor = $derived.by(() => {
		void actorDataTick;
		const id = previewActorIDs[0];
		if (!id) return null;
		const a = (game as { actors?: { get?: (id: string) => unknown } }).actors?.get?.(id);
		return a ?? null;
	});

	const previewFrame = $derived.by(() => {
		if (!track) return undefined;
		const frame = computeTrackFrame(track, playheadT);
		return {
			activeTrackId: track.id,
			playheadT,
			components: frame,
		};
	});

	const previewRendered = $derived.by(() => buildPreviewOverlay(layer, previewActor, previewFrame));

	const previewOverlayComponent = $derived.by(() => {
		const entry = getApi().overlayTypes.get(layer.type);
		return entry?.overlayClass ?? null;
	});
</script>

<div class='live-preview'>
	<header class='live-preview-head'>
		<i class='fas fa-eye'></i>
		<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.livePreview')}</span>
	</header>
	<div class='live-preview-frame' style={`width: ${PREVIEW_FRAME_W}px; height: ${PREVIEW_FRAME_H}px;`}>
		<div class='live-preview-stage' style={`transform: scale(${previewScale}); transform-origin: top left;`}>
			{#if previewOverlayComponent}
				<svelte:component this={previewOverlayComponent} overlay={previewRendered} overlayIndex={0} />
			{/if}
		</div>
	</div>
</div>

<style lang='stylus'>
	.live-preview
		flex 0 0 auto
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 6px

	.live-preview-head
		display flex
		align-items center
		gap 6px
		font-size 10px
		text-transform uppercase
		letter-spacing 0.4px
		opacity 0.7
		margin-bottom 4px

	.live-preview-frame
		background #1a1a1a
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		overflow hidden
		position relative

	.live-preview-stage
		position absolute
		top 0
		left 0
</style>
