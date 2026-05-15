<svelte:options runes={true} />
<script lang='ts'>
	import { getApi } from '../../../utils/helpers.ts';
	import { OverlayComponentData } from '../../../utils/types.ts';
	import FallbackEditor from './FallbackEditor.svelte';

	let { overlay = $bindable(), refreshFn = $bindable() } = $props();

	const w = $derived(overlay.config?.w ?? 1920);
	const h = $derived(overlay.config?.h ?? 1080);
	const bg = $derived(overlay.config?.bg ?? '');

	function setConfig(key: string, value: any) {
		overlay.config = { ...overlay.config, [key]: value };
		refreshFn?.();
	}

	let canvasContainer: HTMLDivElement;
	let containerWidth = $state(400);

	$effect(() => {
		if (!canvasContainer) return;
		const ro = new ResizeObserver(entries => {
			containerWidth = entries[0].contentRect.width;
		});
		ro.observe(canvasContainer);
		return () => ro.disconnect();
	});

	const scaleFactor = $derived(Math.min(containerWidth / w, 1));

	let selectedIndex = $state(-1);

	let addType = $state('');

	const componentNames = $derived(
		getApi().overlayTypes.get('wysiwyg')?.overlayComponentNames ?? new Map<string, string>()
	);

	$effect(() => {
		const first = [...componentNames.keys()][0];
		if (first && !addType) addType = first;
	});

	function addComponent() {
		if (!addType) return;
		const comp = new OverlayComponentData(addType, '', '');
		comp.x = Math.round(w / 2 - 100);
		comp.y = Math.round(h / 2 - 15);
		comp.w = 200;
		comp.h = 30;
		overlay.components = [...overlay.components, comp];
		selectedIndex = overlay.components.length - 1;
		refreshFn?.();
	}

	function onComponentMousedown(e: MouseEvent, index: number) {
		if (overlay.components[index].locked) return;
		e.preventDefault();
		selectedIndex = index;
		const startX = e.clientX;
		const startY = e.clientY;
		const startCompX = overlay.components[index].x ?? 0;
		const startCompY = overlay.components[index].y ?? 0;

		function onMove(e: MouseEvent) {
			overlay.components[index].x = Math.round(startCompX + (e.clientX - startX) / scaleFactor);
			overlay.components[index].y = Math.round(startCompY + (e.clientY - startY) / scaleFactor);
			overlay.components = [...overlay.components];
		}
		function onUp() {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			refreshFn?.();
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	type HandleDir = 'nw' | 'ne' | 'sw' | 'se';

	function onHandleMousedown(e: MouseEvent, dir: HandleDir, index: number) {
		e.preventDefault();
		e.stopPropagation();
		const startX = e.clientX;
		const startY = e.clientY;
		const comp = overlay.components[index];
		const origX = comp.x ?? 0;
		const origY = comp.y ?? 0;
		const origW = comp.w ?? 100;
		const origH = comp.h ?? 30;

		function onMove(e: MouseEvent) {
			const dx = Math.round((e.clientX - startX) / scaleFactor);
			const dy = Math.round((e.clientY - startY) / scaleFactor);
			if (dir.includes('e')) comp.w = Math.max(20, origW + dx);
			if (dir.includes('s')) comp.h = Math.max(10, origH + dy);
			if (dir.includes('w')) { comp.x = origX + dx; comp.w = Math.max(20, origW - dx); }
			if (dir.includes('n')) { comp.y = origY + dy; comp.h = Math.max(10, origH - dy); }
			overlay.components = [...overlay.components];
		}
		function onUp() {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			refreshFn?.();
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	function onCanvasKeydown(e: KeyboardEvent) {
		if (selectedIndex < 0) return;
		const step = e.shiftKey ? 10 : 1;
		const comp = overlay.components[selectedIndex];
		if (e.key === 'ArrowLeft') { comp.x = (comp.x ?? 0) - step; e.preventDefault(); }
		if (e.key === 'ArrowRight') { comp.x = (comp.x ?? 0) + step; e.preventDefault(); }
		if (e.key === 'ArrowUp') { comp.y = (comp.y ?? 0) - step; e.preventDefault(); }
		if (e.key === 'ArrowDown') { comp.y = (comp.y ?? 0) + step; e.preventDefault(); }
		if (e.key === 'Delete' || e.key === 'Backspace') {
			overlay.components = overlay.components.filter((_, i) => i !== selectedIndex);
			selectedIndex = -1;
			e.preventDefault();
		}
		if (e.key === 'Escape') { selectedIndex = -1; e.preventDefault(); }
		if (e.key === 'Tab' && overlay.components.length > 0) {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % overlay.components.length;
		}
		overlay.components = [...overlay.components];
		refreshFn?.();
	}

	function getComponentEditor(type: string) {
		const editor = getApi().overlayTypes.get('wysiwyg')?.overlayComponentEditors?.get(type);
		return editor ?? null;
	}

	let filePickerApp: foundry.applications.apps.FilePicker | undefined;

	async function openFilePicker() {
		if (filePickerApp && filePickerApp.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			filePickerApp.bringToFront();
		} else {
			filePickerApp = new foundry.applications.apps.FilePicker({
				type: 'image',
				callback: (path: string) => {
					setConfig('bg', path);
					filePickerApp = undefined;
				},
				window: { title: 'Select Background Image' },
			});
			await filePickerApp.render();
		}
	}

	const selectedComp = $derived(selectedIndex >= 0 ? overlay.components[selectedIndex] : null);
	const selectedEditor = $derived(selectedComp ? getComponentEditor(selectedComp.type) : null);
</script>

<div class='wysiwyg-editor'>
	<div class='toolbar'>
		<span>W:</span>
		<input
			class='dim-input'
			type='number'
			value={w}
			min='1'
			onchange={(e) => setConfig('w', parseInt((e.target as HTMLInputElement).value) || 1920)}
		/>
		<span>H:</span>
		<input
			class='dim-input'
			type='number'
			value={h}
			min='1'
			onchange={(e) => setConfig('h', parseInt((e.target as HTMLInputElement).value) || 1080)}
		/>
		<span>BG:</span>
		<input
			class='bg-input'
			type='text'
			value={bg}
			onchange={(e) => setConfig('bg', (e.target as HTMLInputElement).value)}
		/>
		<button aria-label='Browse' onclick={openFilePicker} type='button'>
			<i class='fa-solid fa-file'></i>
		</button>
		<button aria-label='Clear Background' onclick={() => setConfig('bg', '')} type='button'>
			<i class='fa-solid fa-xmark'></i>
		</button>
		<span class='toolbar-sep'></span>
		<span>Add:</span>
		<select bind:value={addType}>
			{#each [...componentNames] as [key, name]}
				<option value={key}>{game.i18n?.localize(name)}</option>
			{/each}
		</select>
		<button onclick={addComponent} type='button'>+ Add</button>
	</div>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class='canvas-outer'
		bind:this={canvasContainer}
		role='application'
		aria-label='Canvas Editor'
		tabindex='0'
		onkeydown={onCanvasKeydown}
		style={`height: ${h * scaleFactor + 16}px;`}
	>
		<div
			class='canvas-scaling-wrapper'
			style={`transform: scale(${scaleFactor}); transform-origin: top left; width: ${w}px; height: ${h}px;`}
		>
			<div
				class='canvas-bg'
				style={`width: ${w}px; height: ${h}px; ${bg ? `background-image: url('${bg}'); background-size: cover; background-position: center;` : ''}`}
				role='presentation'
				onmousedown={(e) => { if (e.target === e.currentTarget) selectedIndex = -1; }}
			>
				{#each overlay.components as comp, i (i)}
					{#if comp}
						<div
							class={`comp-wrapper${selectedIndex === i ? ' selected' : ''}${comp.locked ? ' locked' : ''}`}
							style={`left: ${comp.x ?? 0}px; top: ${comp.y ?? 0}px; width: ${comp.w ?? 100}px; height: ${comp.h ?? 30}px; transform: rotate(${comp.rotation ?? 0}deg);`}
							role='button'
							tabindex={i}
							aria-label={`Component ${i}`}
							onmousedown={(e) => onComponentMousedown(e, i)}
						>
							{#if selectedIndex === i}
								<div class='handle nw' role='presentation' onmousedown={(e) => onHandleMousedown(e, 'nw', i)}></div>
								<div class='handle ne' role='presentation' onmousedown={(e) => onHandleMousedown(e, 'ne', i)}></div>
								<div class='handle sw' role='presentation' onmousedown={(e) => onHandleMousedown(e, 'sw', i)}></div>
								<div class='handle se' role='presentation' onmousedown={(e) => onHandleMousedown(e, 'se', i)}></div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>

	{#if selectedComp}
		<div class='properties-panel'>
			<div class='props-row'>
				<label>X:<input type='number' value={selectedComp.x ?? 0} onchange={(e) => { selectedComp.x = parseInt((e.target as HTMLInputElement).value) || 0; overlay.components = [...overlay.components]; refreshFn?.(); }} /></label>
				<label>Y:<input type='number' value={selectedComp.y ?? 0} onchange={(e) => { selectedComp.y = parseInt((e.target as HTMLInputElement).value) || 0; overlay.components = [...overlay.components]; refreshFn?.(); }} /></label>
				<label>W:<input type='number' min='1' value={selectedComp.w ?? 100} onchange={(e) => { selectedComp.w = parseInt((e.target as HTMLInputElement).value) || 100; overlay.components = [...overlay.components]; refreshFn?.(); }} /></label>
				<label>H:<input type='number' min='1' value={selectedComp.h ?? 30} onchange={(e) => { selectedComp.h = parseInt((e.target as HTMLInputElement).value) || 30; overlay.components = [...overlay.components]; refreshFn?.(); }} /></label>
				<label>Rot:<input type='number' value={selectedComp.rotation ?? 0} onchange={(e) => { selectedComp.rotation = parseFloat((e.target as HTMLInputElement).value) || 0; overlay.components = [...overlay.components]; refreshFn?.(); }} /></label>
				<button
					aria-label={selectedComp.locked ? 'Unlock' : 'Lock'}
					title={selectedComp.locked ? 'Unlock' : 'Lock'}
					onclick={() => { selectedComp.locked = !selectedComp.locked; overlay.components = [...overlay.components]; refreshFn?.(); }}
					type='button'
				>
					<i class={selectedComp.locked ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open'}></i>
				</button>
				<button
					aria-label='Delete Component'
					title='Delete'
					onclick={() => { overlay.components = overlay.components.filter((_, i) => i !== selectedIndex); selectedIndex = -1; refreshFn?.(); }}
					type='button'
				>
					<i class='fa-solid fa-trash'></i>
				</button>
			</div>
			<div class='props-row'>
				<label>Type:
					<select
						value={selectedComp.type}
						onchange={(e) => { selectedComp.type = (e.target as HTMLSelectElement).value; overlay.components = [...overlay.components]; refreshFn?.(); }}
					>
						{#each [...componentNames] as [key, name]}
							<option value={key}>{game.i18n?.localize(name)}</option>
						{/each}
					</select>
				</label>
			</div>
			<div class='props-row data-row'>
				{#if selectedEditor}
					{@const EditorComponent = selectedEditor}
					<EditorComponent
						bind:data={() => selectedComp.data, (v) => { selectedComp.data = v; overlay.components = [...overlay.components]; refreshFn?.(); }}
					/>
				{:else}
					<label>Data:
						<input
							type='text'
							value={selectedComp.data}
							onchange={(e) => { selectedComp.data = (e.target as HTMLInputElement).value; overlay.components = [...overlay.components]; refreshFn?.(); }}
						/>
					</label>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style lang='stylus'>
.wysiwyg-editor
	display flex
	flex-direction column
	gap 4px
	width 100%

.toolbar
	display flex
	flex-wrap wrap
	align-items center
	gap 4px
	padding 4px

	.dim-input
		width 60px

	.bg-input
		flex 1
		min-width 80px

	.toolbar-sep
		flex-basis 100%
		height 0

	button
		width 30px
		height 30px
		padding 0

.canvas-outer
	width 100%
	overflow hidden
	position relative
	background #111

.canvas-scaling-wrapper
	position absolute
	top 8px
	left 8px

.canvas-bg
	position relative
	background black
	outline 1px solid #444
	overflow hidden

.comp-wrapper
	position absolute
	cursor move
	box-sizing border-box

	&.selected
		outline 2px solid cornflowerblue

	&.locked
		cursor not-allowed

.handle
	position absolute
	width 8px
	height 8px
	background cornflowerblue
	border 1px solid white
	box-sizing border-box
	z-index 10

	&.nw
		top -4px
		left -4px
		cursor nw-resize

	&.ne
		top -4px
		right -4px
		cursor ne-resize

	&.sw
		bottom -4px
		left -4px
		cursor sw-resize

	&.se
		bottom -4px
		right -4px
		cursor se-resize

.properties-panel
	border-top 1px solid #555
	padding 4px
	display flex
	flex-direction column
	gap 4px

	.props-row
		display flex
		flex-wrap wrap
		align-items center
		gap 6px

		label
			display flex
			align-items center
			gap 3px

			input[type='number']
				width 60px

		&.data-row
			flex-wrap wrap

	button
		width 30px
		height 30px
		padding 0
</style>
