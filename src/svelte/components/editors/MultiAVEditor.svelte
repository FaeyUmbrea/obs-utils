<svelte:options runes={true} />
<script lang='ts'>
	import Select from '../select/Select.svelte';
	import { getActorValueGroups } from '../../../utils/helpers';

	let { data = $bindable(';') } = $props<{ data: string }>();
	let valuePath = $state(data?.split(';')[0] ?? '');
	let maxPath = $state(data?.split(';')[1] ?? '');
	const groups = getActorValueGroups();

	function onChange() {
		data = `${valuePath ?? ''};${maxPath ?? ''}`;
	}
</script>

<div class='editor'>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.valuePath')}</span>
		<Select
			options={groups}
			bind:value={() => valuePath, v => { valuePath = (v as string) ?? ''; onChange(); }}
			creatable={true}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.maxPath')}</span>
		<Select
			options={groups}
			bind:value={() => maxPath, v => { maxPath = (v as string) ?? ''; onChange(); }}
			creatable={true}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	</label>
</div>

<style lang='stylus'>
	.editor
		display flex
		flex-direction column
		gap 8px

	.row
		display flex
		flex-direction column
		gap 4px

	.lbl
		font-size 11px
		opacity 0.7
		letter-spacing 0.3px
</style>
