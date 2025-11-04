<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData } from '../../utils/types.ts';
	import { SortableList } from '@jhubbardsf/svelte-sortablejs';
	import StyleEditor from '../../applications/styleditor.ts';
	import { preventUndefinedNullInArray } from '../../utils/helpers.ts';
	import { OverlayComponentData } from '../../utils/types.ts';
	import SingleLineOverlayEditor from './editors/SingleLineOverlayEditor.svelte';

	let { overlay = $bindable(), removeFn = $bindable(), componentindex = $bindable(), refreshFn = $bindable() } = $props<{ overlay: OverlayData; removeFn: (index: number) => void; componentindex: number; refreshFn: () => void }>();

	function handleRemove(index: number) {
		overlay.components = [
			...overlay.components.slice(0, index),
			...overlay.components.slice(index + 1, overlay.components.length),
		];
		overlay.components = preventUndefinedNullInArray(overlay.components);
		refreshFn?.();
	}

	function handleAdd() {
		overlay.components = overlay.components.concat(new OverlayComponentData());
		overlay.components = preventUndefinedNullInArray(overlay.components);
		refreshFn?.();
	}

	let rerender = $state(0);

	function handleReorder(e: any) {
		[
			overlay.components[e.oldDraggableIndex],
			overlay.components[e.newDraggableIndex],
		] = [
			overlay.components[e.newDraggableIndex],
			overlay.components[e.oldDraggableIndex],
		];
		overlay.components = preventUndefinedNullInArray(overlay.components);
		rerender++;
		refreshFn?.();
	}

	function openStyleEditor() {
		const editor = new StyleEditor({}, overlay.style, (styleNew: string) => {
			overlay.style = styleNew;
			refreshFn?.();
		});
		editor.render(true);
	}

	function setComponentData(index: number, value: OverlayComponentData) {
		if (index === null || index === undefined || value === null || value === undefined) {
			return;
		}
		overlay.components[index] = value;
		overlay = overlay;
	}
</script>

<div class='scroll'>
	<ul>
		<SortableList class='sortable' animation={150} handle='.grab' onEnd={handleReorder}>
			{#key rerender}
				{#each overlay.components as component, index (overlay.components.indexOf(component))}
					<SingleLineOverlayEditor
						bind:component={() => overlay.components[index], v => setComponentData(index, v)}
						removeFn={handleRemove}
						index={index}
						refreshFn={refreshFn}
					/>
				{/each}
			{/key}
		</SortableList>
	</ul>
</div>
<footer>
	<button
		class='add'
		aria-label='Add a new overlay'
		onclick={() => handleAdd()}
		title={game.i18n?.localize('obs-utils.applications.overlayEditor.addButton')}
		type='button'><i class='fas fa-plus'></i></button
	>
	<button
		class='add'
		aria-label='Edit style'
		onclick={() => openStyleEditor()}
		title={game.i18n?.localize('obs-utils.applications.overlayEditor.editStyleButton')}
		type='button'><i class='fas fa-pencil'></i></button
	>
	<button
		class='remove-tab'
		aria-label='Remove overlay'
		onclick={() => removeFn(componentindex)}
		title={game.i18n?.localize('obs-utils.applications.overlayEditor.removeButton')}
		type='button'><i class='fas fa-trash'></i></button
	>
</footer>

<style lang='stylus'>
  footer {
    position absolute;
    width: calc(100% - 10px);
    bottom: 0;
    left: 5px;
    display: flex;
    padding: 0 5px 0 0;
    button {
      width 100%
      height 35px
    }

    .remove-tab {
      width: calc(100% - 35px);
    }
  }

  .scroll {
    overflow: scroll;
    float: left;
    max-height: calc(100% - 40px);
    width: 100%;
    padding-right: 10px;
    padding-left: 3px;
    height: 100%;

    ul {
      list-style-type: none;
      padding: 0;
    }
  }
</style>
