<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData, OverlayComponentData } from '../../utils/types.ts';
	import { tick } from 'svelte';
	import { getApi } from '../../utils/helpers.ts';
	import { buildPreviewOverlay, resolveComponentValues } from '../../utils/render.ts';
	import SingleLineOverlay from '../streamoverlays/SingleLineOverlay.svelte';

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

	function getComponentRenderer(type: string) {
		const entry = getApi().overlayTypes.get('wysiwyg');
		return entry?.overlayComponents.get(type) ?? null;
	}

	function previewActorID(): string | null {
		return actorIDs[0] ?? null;
	}

	function previewActor(): unknown {
		const id = previewActorID();
		if (!id) return undefined;
		return (game as { actors?: { get?: (id: string) => unknown } }).actors?.get?.(id);
	}

	/**
	 * Editor-only resolver. Reuses the runtime resolver so the canvas shows the
	 * same values the live `/stream` view would. No registry, no reactivity —
	 * this re-runs whenever Svelte re-renders the canvas, which is fine for the
	 * editor's snapshot semantics.
	 */
	function previewValues(c: OverlayComponentData) {
		return resolveComponentValues(c.type, c.data, previewActor(), undefined);
	}

	function onCanvasMouseDown(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			selectedComponentIndex = null;
		}
	}

	// ─── Drag/resize via direct DOM manipulation ────────────────────────────
	type HandleDir = 'nw' | 'ne' | 'sw' | 'se';

	function getDOMRefs(layerIndex: number, compIndex: number) {
		const root = document.getElementById(`composer-canvas-${layerIndex}`);
		const wrapper = root?.querySelector<HTMLElement>(`[data-component-wrapper="${compIndex}"]`) ?? null;
		const hit = root?.querySelector<HTMLElement>(`[data-hit="${compIndex}"]`) ?? null;
		const handles = root?.querySelectorAll<HTMLElement>(`[data-handle-for="${compIndex}"]`);
		return { wrapper, hit, handles };
	}

	function selectComponent(e: MouseEvent, index: number) {
		e.stopPropagation();
		selectedComponentIndex = index;
	}

	function onComponentMousedown(e: MouseEvent, index: number) {
		if (selectedLayerIndex === null) return;
		const layer = overlays[selectedLayerIndex];
		if (!layer || layer.type !== 'wysiwyg') return;
		const comp = layer.components[index];
		if (!comp || comp.locked) return;
		e.preventDefault();
		e.stopPropagation();
		const layerIdx = selectedLayerIndex;
		selectedComponentIndex = index;

		const startClientX = e.clientX;
		const startClientY = e.clientY;
		const origX = comp.x ?? 0;
		const origY = comp.y ?? 0;
		const { wrapper, hit } = getDOMRefs(layerIdx, index);
		// Handles may not be in the DOM yet (they only render once the component is selected,
		// which happens on this same mousedown). Re-query each frame so we catch them.
		let cachedHandles: NodeListOf<HTMLElement> | null = null;

		let lastDx = 0;
		let lastDy = 0;

		function applyTransform(t: string) {
			if (wrapper) wrapper.style.transform = t;
			if (hit) hit.style.transform = t;
			if (!cachedHandles || cachedHandles.length === 0) {
				const root = document.getElementById(`composer-canvas-${layerIdx}`);
				cachedHandles = root?.querySelectorAll<HTMLElement>(`[data-handle-for="${index}"]`) ?? null;
			}
			cachedHandles?.forEach((h) => {
				h.style.transform = t;
			});
		}

		function onMove(ev: MouseEvent) {
			lastDx = ev.clientX - startClientX;
			lastDy = ev.clientY - startClientY;
			applyTransform(`translate(${lastDx}px, ${lastDy}px)`);
		}
		async function onUp() {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			const c = layer.components[index];
			if (!c) {
				applyTransform('');
				return;
			}
			c.x = Math.round(origX + lastDx);
			c.y = Math.round(origY + lastDy);
			layer.components = [...layer.components];
			// Clear the translate only after Svelte has reflected the new x/y into
			// the template's inline style, otherwise the element flashes back at
			// its original position for one frame.
			await tick();
			applyTransform('');
			commit?.();
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	function onHandleMousedown(e: MouseEvent, dir: HandleDir, index: number) {
		if (selectedLayerIndex === null) return;
		const layer = overlays[selectedLayerIndex];
		if (!layer || layer.type !== 'wysiwyg') return;
		const comp = layer.components[index];
		if (!comp || comp.locked) return;
		e.preventDefault();
		e.stopPropagation();
		selectedComponentIndex = index;

		const startClientX = e.clientX;
		const startClientY = e.clientY;
		const origX = comp.x ?? 0;
		const origY = comp.y ?? 0;
		const origW = comp.w ?? 100;
		const origH = comp.h ?? 30;
		const { wrapper, hit, handles } = getDOMRefs(selectedLayerIndex, index);

		let lastBounds = { x: origX, y: origY, w: origW, h: origH };

		function compute(ev: MouseEvent) {
			const dx = ev.clientX - startClientX;
			const dy = ev.clientY - startClientY;
			let x = origX;
			let y = origY;
			let w = origW;
			let h = origH;
			if (dir.includes('e')) w = Math.max(20, origW + dx);
			if (dir.includes('s')) h = Math.max(10, origH + dy);
			if (dir.includes('w')) {
				x = origX + dx;
				w = Math.max(20, origW - dx);
			}
			if (dir.includes('n')) {
				y = origY + dy;
				h = Math.max(10, origH - dy);
			}
			return { x, y, w, h };
		}

		function applyToDOM(b: { x: number; y: number; w: number; h: number }) {
			if (wrapper) {
				wrapper.style.left = `${b.x}px`;
				wrapper.style.top = `${b.y}px`;
				wrapper.style.width = `${b.w}px`;
				wrapper.style.height = `${b.h}px`;
			}
			if (hit) {
				hit.style.left = `${b.x}px`;
				hit.style.top = `${b.y}px`;
				hit.style.width = `${b.w}px`;
				hit.style.height = `${b.h}px`;
			}
			handles?.forEach((handleEl) => {
				const handleDir = handleEl.dataset.handleDir as HandleDir | undefined;
				if (!handleDir) return;
				const cornerX = handleDir.includes('w') ? b.x : b.x + b.w;
				const cornerY = handleDir.includes('n') ? b.y : b.y + b.h;
				handleEl.style.left = `${cornerX}px`;
				handleEl.style.top = `${cornerY}px`;
			});
		}

		function onMove(ev: MouseEvent) {
			lastBounds = compute(ev);
			applyToDOM(lastBounds);
		}
		function onUp() {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			const c = layer.components[index];
			if (c) {
				c.x = Math.round(lastBounds.x);
				c.y = Math.round(lastBounds.y);
				c.w = Math.round(lastBounds.w);
				c.h = Math.round(lastBounds.h);
				layer.components = [...layer.components];
				commit?.();
			}
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
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
						{@const x = comp.x ?? 0}
						{@const y = comp.y ?? 0}
						{@const w = comp.w ?? 100}
						{@const h = comp.h ?? 30}
						{@const rot = comp.rotation ?? 0}
						{@const selected = selectedComponentIndex === index}
						{@const Renderer = getComponentRenderer(comp.type)}

						<!-- Rendered content -->
						<div
							class='comp-wrapper'
							data-component-wrapper={index}
							data-component-id={comp.id ?? ''}
							style={`left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; transform: rotate(${rot}deg);`}
						>
							{#if Renderer}
								<Renderer
									values={previewValues(comp)}
									componentIndex={index}
									style={comp.style}
								/>
							{/if}
						</div>

						<!-- Interactive hit box (always on top of content) -->
						<div
							class='hit'
							class:selected
							class:locked={comp.locked}
							data-hit={index}
							style={`left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px;`}
							onmousedown={e => onComponentMousedown(e, index)}
							onclick={e => selectComponent(e, index)}
							onkeydown={e => (e.key === 'Enter' || e.key === ' ') && selectComponent(e as any, index)}
							role='button'
							tabindex='0'
							aria-label={`Component ${index}: ${comp.type}`}
						></div>

						{#if selected && !comp.locked}
							{#each ['nw', 'ne', 'sw', 'se'] as dir (dir)}
								{@const cornerX = dir.includes('w') ? x : x + w}
								{@const cornerY = dir.includes('n') ? y : y + h}
								<div
									class={`handle handle-${dir}`}
									data-handle-for={index}
									data-handle-dir={dir}
									style={`left: ${cornerX}px; top: ${cornerY}px;`}
									onmousedown={e => onHandleMousedown(e, dir as HandleDir, index)}
									role='presentation'
								></div>
							{/each}
						{/if}
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

		// For non-WYSIWYG previews the area sizes to its content (no fixed 1920×1080)
		// so the read-only Simple/Roll preview doesn't generate phantom scroll space.
		&.auto-size
			width auto
			height auto
			max-width calc(100% - 32px)
			background transparent
			box-shadow none
			margin 0

	.comp-wrapper
		position absolute
		overflow hidden
		pointer-events none

	.hit
		position absolute
		cursor move
		border 1px solid transparent
		background transparent

		&:hover
			border-color rgba(255, 144, 0, 0.5)

		&.selected
			border-color rgba(255, 144, 0, 1)
			box-shadow inset 0 0 0 1px rgba(0, 0, 0, 0.3)

		&.locked
			cursor not-allowed

	.handle
		position absolute
		width 12px
		height 12px
		margin -6px 0 0 -6px
		background #ff9000
		border 1.5px solid #fff
		border-radius 2px
		box-shadow 0 1px 3px rgba(0, 0, 0, 0.5)
		z-index 2

		&.handle-nw
			cursor nwse-resize
		&.handle-ne
			cursor nesw-resize
		&.handle-sw
			cursor nesw-resize
		&.handle-se
			cursor nwse-resize

	.preview-host
		// Sized by content, not stretched to fill the canvas-area.
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
