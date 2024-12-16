<script>
	import { localize } from '#runtime/util/i18n';
	import StyleEditor from '../../../applications/styleditor.js';
	import { getApi } from '../../../utils/helpers';
	import FallbackEditor from './FallbackEditor.svelte';

	export let component;
	export let removeFn;
	export let index;

	const componentNames = getApi().overlayTypes.get('sl').overlayComponentNames;

	// const componentEditors =  getApi().overlayTypes.get("sl").overlayComponentEditors;

	function openStyleEditor() {
		const editor = new StyleEditor(component.style, (styleNew) => {
			component.style = styleNew;
		});
		editor.render(true);
	}

	function getEditor(type) {
		const editor = getApi()
			.overlayTypes
			.get('sl')
			.overlayComponentEditors
			.get(type);
		if (editor !== undefined) {
			return editor;
		} else {
			return FallbackEditor;
		}
	}

	function getCompactButtons(type) {
		return !!getApi().overlayTypes.get('sl').compactEditorButtons.get(type);
	}
</script>

<li data-list-key={index}>
	<div class='component handle'>
		<i class='fa-light fa-bars grab'></i>
		<select bind:value={component.type} name='types'>
			{#each [...componentNames] as [component, name]}
				<option value={component}>{localize(name)}</option>
			{/each}
		</select>
		<svelte:component
			this={getEditor(component.type)}
			bind:data={component.data}
		/>
		<div class={getCompactButtons(component.type) ? '' : 'buttons'}>
			<button
				on:click={() => removeFn(index)}
				title={localize(
					'obs-utils.applications.overlayEditor.removeComponentButton',
				)}
				type='button'
			>
				<i class='fas fa-trash'></i>
			</button>
			<button
				class='add'
				on:click={() => openStyleEditor()}
				title={localize(
					'obs-utils.applications.overlayEditor.editStyleButton',
				)}
				type='button'
			>
				<i class='fas fa-pencil'></i>
			</button>
		</div>
	</div>
</li>

<style lang='stylus'>
  li {
    padding-top: 1px;
    padding-bottom: 1px;
  }

  .grab {
    height: 35px;
    width: 35px;
    font-size: 25px;
    text-align: center;
    align-self: center;
    line-height: 35px;
  }

  .component {
    display: grid;
    grid-template-columns: 35px 150px auto 35px 35px;
    grid-template-rows: auto;

    button {
      width: 35px;
      margin: auto;
    }

    select {
      height: auto;
    }
    .buttons {
      grid-column 4 / span 2;
      display flex;
    }
  }
</style>
