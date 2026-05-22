<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayComponentData, OverlayData } from '../../utils/types.ts';
	import { tick } from 'svelte';
	import { getApi } from '../../utils/helpers.ts';
	import { resolveComponentValues } from '../../utils/render.ts';

	type HandleDir = 'nw' | 'ne' | 'sw' | 'se';

	const {
		comp,
		index,
		layerIndex,
		layer,
		selected,
		previewActor,
		commit,
		onSelect,
	} = $props<{
		comp: OverlayComponentData;
		index: number;
		layerIndex: number;
		layer: OverlayData;
		selected: boolean;
		previewActor: () => unknown;
		commit: () => void;
		onSelect: (index: number) => void;
	}>();

	const x = $derived(comp.x ?? 0);
	const y = $derived(comp.y ?? 0);
	const w = $derived(comp.w ?? 100);
	const h = $derived(comp.h ?? 30);
	const rot = $derived(comp.rotation ?? 0);
	const Renderer = $derived(getComponentRenderer(comp.type));

	function getComponentRenderer(type: string) {
		const entry = getApi().overlayTypes.get('wysiwyg');
		return entry?.overlayComponents.get(type) ?? null;
	}

	function previewValues(c: OverlayComponentData) {
		return resolveComponentValues(c.type, c.data, previewActor(), undefined);
	}

	function getDOMRefs() {
		const root = document.getElementById(`composer-canvas-${layerIndex}`);
		const wrapper = root?.querySelector<HTMLElement>(`[data-component-wrapper="${index}"]`) ?? null;
		const hit = root?.querySelector<HTMLElement>(`[data-hit="${index}"]`) ?? null;
		const handles = root?.querySelectorAll<HTMLElement>(`[data-handle-for="${index}"]`);
		return { wrapper, hit, handles };
	}

	function selectComponent(e: MouseEvent) {
		e.stopPropagation();
		onSelect(index);
	}

	function onComponentMousedown(e: MouseEvent) {
		if (comp.locked) return;
		e.preventDefault();
		e.stopPropagation();
		onSelect(index);

		const startClientX = e.clientX;
		const startClientY = e.clientY;
		const origX = comp.x ?? 0;
		const origY = comp.y ?? 0;
		const { wrapper, hit } = getDOMRefs();
		// Handles aren't in the DOM until the component is selected (this same mousedown).
		let cachedHandles: NodeListOf<HTMLElement> | null = null;

		let lastDx = 0;
		let lastDy = 0;

		function applyTransform(t: string) {
			if (wrapper) wrapper.style.transform = t;
			if (hit) hit.style.transform = t;
			if (!cachedHandles || cachedHandles.length === 0) {
				const root = document.getElementById(`composer-canvas-${layerIndex}`);
				cachedHandles = root?.querySelectorAll<HTMLElement>(`[data-handle-for="${index}"]`) ?? null;
			}
			cachedHandles?.forEach((handleEl) => {
				handleEl.style.transform = t;
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
			// Clear translate after Svelte writes the new x/y, otherwise the element
			// snaps back for one frame.
			await tick();
			applyTransform('');
			commit?.();
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	function onHandleMousedown(e: MouseEvent, dir: HandleDir) {
		if (comp.locked) return;
		e.preventDefault();
		e.stopPropagation();
		onSelect(index);

		const startClientX = e.clientX;
		const startClientY = e.clientY;
		const origX = comp.x ?? 0;
		const origY = comp.y ?? 0;
		const origW = comp.w ?? 100;
		const origH = comp.h ?? 30;
		const { wrapper, hit, handles } = getDOMRefs();

		let lastBounds = { x: origX, y: origY, w: origW, h: origH };

		function compute(ev: MouseEvent) {
			const dx = ev.clientX - startClientX;
			const dy = ev.clientY - startClientY;
			let nx = origX;
			let ny = origY;
			let nw = origW;
			let nh = origH;
			if (dir.includes('e')) nw = Math.max(20, origW + dx);
			if (dir.includes('s')) nh = Math.max(10, origH + dy);
			if (dir.includes('w')) {
				nx = origX + dx;
				nw = Math.max(20, origW - dx);
			}
			if (dir.includes('n')) {
				ny = origY + dy;
				nh = Math.max(10, origH - dy);
			}
			return { x: nx, y: ny, w: nw, h: nh };
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
</script>

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

<div
	class='hit'
	class:selected
	class:locked={comp.locked}
	data-hit={index}
	style={`left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px;`}
	onmousedown={onComponentMousedown}
	onclick={selectComponent}
	onkeydown={e => (e.key === 'Enter' || e.key === ' ') && selectComponent(e as unknown as MouseEvent)}
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
			onmousedown={e => onHandleMousedown(e, dir as HandleDir)}
			role='presentation'
		></div>
	{/each}
{/if}

<style lang='stylus'>
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
</style>
