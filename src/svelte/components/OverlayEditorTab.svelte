<script>
	import { localize } from '#runtime/util/i18n';
	import { SortableList } from '@jhubbardsf/svelte-sortablejs';
	import StyleEditor from '../../applications/styleditor.ts';
	import { OverlayComponentData } from '../../utils/types.ts';
	import OverlayComponentEditor from './editors/SingleLineOverlayEditor.svelte';

	export let overlay;
	export let removeFn;
	export let componentindex;

	function handleRemove(index) {
		overlay.components = [
			...overlay.components.slice(0, index),
			...overlay.components.slice(index + 1, overlay.components.length),
		];
	}

	function handleAdd() {
		overlay.components = overlay.components.concat(new OverlayComponentData());
	}

	let rerender = 0;

	function handleReorder(e) {
		[
			overlay.components[e.oldDraggableIndex],
			overlay.components[e.newDraggableIndex],
		] = [
			overlay.components[e.newDraggableIndex],
			overlay.components[e.oldDraggableIndex],
		];
		rerender++;
	}

	function openStyleEditor() {
		const editor = new StyleEditor(overlay.style, (styleNew) => {
			overlay.style = styleNew;
		});
		editor.render(true);
	}
</script>

<div class='scroll'>
	<ul>
		<SortableList animation={150} handle='.grab' onEnd={handleReorder}>
			{#key rerender}
				{#each overlay.components as component, index (overlay.components.indexOf(component))}
					<OverlayComponentEditor
						bind:component={component}
						removeFn={handleRemove}
						index={index}
					/>
				{/each}
			{/key}
		</SortableList>
	</ul>
</div>
<footer>
	<button
		class='add'
		on:click={() => handleAdd()}
		title={localize('obs-utils.applications.overlayEditor.addButton')}
		type='button'><i class='fas fa-plus'></i></button
	>
	<button
		class='add'
		on:click={() => openStyleEditor()}
		title={localize('obs-utils.applications.overlayEditor.editStyleButton')}
		type='button'><i class='fas fa-pencil'></i></button
	>
	<button
		class='remove-tab'
		on:click={() => removeFn(componentindex)}
		title={localize('obs-utils.applications.overlayEditor.removeButton')}
		type='button'><i class='fas fa-trash'></i></button
	>
</footer>

<style lang='stylus'>
  footer {
    position: absolute;
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
