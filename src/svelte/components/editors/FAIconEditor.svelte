<svelte:options runes={true} />
<script lang='ts'>
	import { getDataPickerGroups } from '../../../utils/helpers';
	import Select from '../select/Select.svelte';
	import IconInputField from './IconInputField.svelte';

	let { data = $bindable('') } = $props<{ data: string }>();

	function looksLikePath(v: string): boolean {
		if (!v) return false;
		if (v.startsWith('trigger.')) return true;
		return v.includes('.') && /^[\w.]+$/.test(v);
	}

	let dataDriven = $state(looksLikePath(data ?? ''));
	const groups = getDataPickerGroups();
</script>

<div class='av-editor'>
	<label class='mode-toggle'>
		<input type='checkbox' bind:checked={dataDriven} />
		<span>{game.i18n?.localize('obs-utils.applications.componentEditors.dataDriven') ?? 'Data-driven'}</span>
	</label>
	{#if dataDriven}
		<Select
			options={groups}
			bind:value={data}
			creatable={true}
			placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	{:else}
		<IconInputField
			bind:value={data}
			placeholder={game.i18n?.localize('obs-utils.applications.componentEditors.staticPlaceholder') ?? ''}
		/>
	{/if}
</div>

<style lang='stylus'>
	.av-editor
		display flex
		flex-direction column
		gap 6px

	.mode-toggle
		display inline-flex
		align-items center
		gap 6px
		font-size 11px
		opacity 0.85

		input
			margin 0
</style>
