<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData } from '../../utils/types.ts';
	import { buildPreviewOverlay } from '../../utils/render.ts';
	import SingleLineOverlay from '../streamoverlays/SingleLineOverlay.svelte';
	import CanvasComponentBox from './CanvasComponentBox.svelte';

	let {
		overlays,
		actorIDs,
		selectedLayerIndex = $bindable(),
		selectedComponentIndex = $bindable(),
		commit,
	} = $props<{
		overlays: OverlayData[];
		actorIDs: string[];
		selectedLayerIndex: number | null;
		selectedComponentIndex: number | null;
		commit: () => void;
	}>();

	const REF_W_DEFAULT = 1920;
	const REF_H_DEFAULT = 1080;

	const selectedLayer = $derived(
		selectedLayerIndex !== null ? overlays[selectedLayerIndex] : null,
	);
	const selectedIsWYSIWYG = $derived(
		!!selectedLayer && selectedLayer.type === 'wysiwyg',
	);
	const selectedIsSimple = $derived(
		!!selectedLayer && selectedLayer.type === 'sl',
	);

	const canvasW = $derived.by(() => {
		if (selectedLayer?.type === 'wysiwyg') return selectedLayer.config?.w ?? REF_W_DEFAULT;
		return REF_W_DEFAULT;
	});
	const canvasH = $derived.by(() => {
		if (selectedLayer?.type === 'wysiwyg') return selectedLayer.config?.h ?? REF_H_DEFAULT;
		return REF_H_DEFAULT;
	});

	function previewActorID(): string | null {
		return actorIDs[0] ?? null;
	}

	function previewActor(): unknown {
		const id = previewActorID();
		if (!id) return undefined;
		return (game as { actors?: { get?: (id: string) => unknown } }).actors?.get?.(id);
	}

	function onCanvasMouseDown(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			selectedComponentIndex = null;
		}
	}

	function selectIndex(index: number) {
		selectedComponentIndex = index;
	}

	function onKeydown(e: KeyboardEvent) {
		if (!selectedIsWYSIWYG || selectedLayerIndex === null) return;
		if (selectedComponentIndex === null) return;
		const layer = overlays[selectedLayerIndex];
		const idx = selectedComponentIndex;
		const comp = layer.components[idx];
		if (!comp) return;
		const step = e.shiftKey ? 10 : 1;

		if (e.key === 'ArrowLeft') {
			comp.x = (comp.x ?? 0) - step;
			e.preventDefault();
		} else if (e.key === 'ArrowRight') {
			comp.x = (comp.x ?? 0) + step;
			e.preventDefault();
		} else if (e.key === 'ArrowUp') {
			comp.y = (comp.y ?? 0) - step;
			e.preventDefault();
		} else if (e.key === 'ArrowDown') {
			comp.y = (comp.y ?? 0) + step;
			e.preventDefault();
		} else if (e.key === 'Escape') {
			selectedComponentIndex = null;
			e.preventDefault();
			return;
		} else if (e.key === 'Tab' && layer.components.length > 0) {
			e.preventDefault();
			selectedComponentIndex = (idx + 1) % layer.components.length;
			return;
		} else {
			return;
		}

		layer.components = [...layer.components];
		commit?.();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class='canvas-shell overlay-renderer'>
	<div class='canvas-scroll'>
		<div
			class='canvas-area'
			class:auto-size={!selectedIsWYSIWYG}
			style={selectedIsWYSIWYG ? `width: ${canvasW}px; height: ${canvasH}px;` : undefined}
			onmousedown={onCanvasMouseDown}
			role='presentation'
			id={selectedLayerIndex !== null ? `composer-canvas-${selectedLayerIndex}` : undefined}
			data-overlay-id={selectedLayer?.id ?? ''}
		>
			{#if selectedIsWYSIWYG && selectedLayer}
				{@const layer = selectedLayer}
				{#each layer.components as comp, index (layer.components.indexOf(comp))}
					{#if comp}
						<CanvasComponentBox
							{comp}
							{index}
							layerIndex={selectedLayerIndex!}
							{layer}
							selected={selectedComponentIndex === index}
							{previewActor}
							{commit}
							onSelect={selectIndex}
						/>
					{/if}
				{/each}
			{:else if selectedIsSimple && selectedLayer}
				<div class='preview-host' aria-label='Simple Overlay preview'>
					<div class='preview-tag'>{game.i18n?.localize('obs-utils.applications.overlayEditor.previewReadOnly')}</div>
					<div class='simple-host'>
						<SingleLineOverlay
							overlay={buildPreviewOverlay(selectedLayer, previewActor())}
							overlayIndex={selectedLayerIndex ?? 0}
						/>
					</div>
				</div>
			{:else}
				<div class='non-canvas-hint'>
					<i class='fas fa-arrow-left'></i>
					<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.selectLayerHint')}</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang='stylus'>
	.canvas-shell
		width 100%
		height 100%
		display flex
		flex-direction column
		min-height 0

	.canvas-scroll
		flex 1 1 auto
		min-height 0
		overflow auto
		background repeating-linear-gradient(45deg, #1a1a1a 0px, #1a1a1a 14px, #181818 14px, #181818 28px)

	.canvas-area
		position relative
		background #000
		box-shadow 0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.4)
		margin 16px

		// Non-WYSIWYG previews size to content so the read-only preview doesn't
		// generate phantom scroll space.
		&.auto-size
			width auto
			height auto
			max-width calc(100% - 32px)
			background transparent
			box-shadow none
			margin 0

	.preview-host
		display flex
		flex-direction column
		align-items center
		justify-content flex-start
		padding 16px
		gap 12px

		.preview-tag
			display flex
			align-items center
			gap 8px
			font-size 11px
			letter-spacing 0.5px
			text-transform uppercase
			opacity 0.65
			padding 4px 10px
			background rgba(0, 0, 0, 0.4)
			border-radius 3px
			align-self flex-start

		.simple-host
			width 100%
			max-width 100%
			padding 8px
			background rgba(255, 255, 255, 0.02)
			border 1px dashed rgba(255, 255, 255, 0.08)

	.non-canvas-hint
		position absolute
		top 50%
		left 50%
		transform translate(-50%, -50%)
		display flex
		flex-direction column
		align-items center
		gap 8px
		padding 16px
		color rgba(255, 255, 255, 0.5)
		font-size 14px
		text-align center

		i
			font-size 20px
</style>
