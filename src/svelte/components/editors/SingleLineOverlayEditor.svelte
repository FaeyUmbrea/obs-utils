<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayComponentData } from '../../../utils/types.ts';
	import StyleEditor from '../../../applications/styleditor.ts';
	import { getApi } from '../../../utils/helpers.ts';
	import FallbackEditor from './FallbackEditor.svelte';

	let { component = $bindable(), removeFn = $bindable(), index = $bindable(), refreshFn = $bindable() } = $props<{ component: OverlayComponentData; removeFn: (index: number) => void; index: number; refreshFn: () => void }>();

	const componentNames = getApi().overlayTypes.get('sl')?.overlayComponentNames!;

	function openStyleEditor() {
		const editor = new StyleEditor({}, component.style, (styleNew: string) => {
			component.style = styleNew;
			refreshFn?.();
		});
		editor.render(true);
	}

	let prevData = $state(component.data);
	$effect(() => {
		// detect component.data deep reference change
		if (prevData !== component.data) {
			prevData = component.data;
			refreshFn?.();
		}
	});

	function getEditor(type: string) {
		const editor = getApi()
			.overlayTypes
			.get('sl')
			?.overlayComponentEditors
			.get(type as any);
		if (editor !== undefined) {
			return editor;
		} else {
			return FallbackEditor;
		}
	}

	function getCompactButtons(type: string) {
		return !!getApi().overlayTypes.get('sl')?.compactEditorButtons.get(type as any);
	}

	const Component = $derived(getEditor(component.type));

	function setType(type: string) {
		if (!type) return;
		component.type = type;
		component = component;
	}

	function setData(data: string) {
		component.data = data;
		component = component;
	}
</script>

<li data-list-key={index}>
	<div class='component handle'>
		<i class='fa-light fa-bars grab'></i>
		<select bind:value={() => component.type, v => setType(v)} name='types' onchange={() => refreshFn?.()}>
			{#each [...componentNames] as [component, name]}
				<option value={component}>{game.i18n?.localize(name)}</option>
			{/each}
		</select>
		<Component bind:data={() => component.data, v => setData(v)} />
		<div class={getCompactButtons(component.type) ? '' : 'buttons'}>
			<button
				aria-label='Remove'
				onclick={() => removeFn(index)}
				title={game.i18n?.localize(
					'obs-utils.applications.overlayEditor.removeComponentButton',
				)}
				type='button'
			>
				<i class='fas fa-trash'></i>
			</button>
			<button
				aria-label='Edit Style'
				class='add'
				onclick={() => openStyleEditor()}
				title={game.i18n?.localize(
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
      height: 35px;
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
