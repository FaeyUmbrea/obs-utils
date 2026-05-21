<svelte:options runes={true} />
<script lang='ts'>
	import Select from '../select/Select.svelte';
	import { getDataPickerGroups } from '../../../utils/helpers';
	import TriggerPathWarning from './TriggerPathWarning.svelte';

	let { data = $bindable(';;') } = $props<{ data: string }>();

	let av1 = $state(data?.split(';')[0] ?? '');
	let icon1 = $state(data?.split(';')[1] ?? '');
	let icon2 = $state(data?.split(';')[2] ?? '');
	const groups = getDataPickerGroups();

	function onChange() {
		data = `${av1 ?? ''};${icon1 ?? ''};${icon2 ?? ''}`;
	}
</script>

<div class='editor'>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.valuePath')}</span>
		<Select
			options={groups}
			bind:value={() => av1, v => { av1 = (v as string) ?? ''; onChange(); }}
			creatable={true}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
		<TriggerPathWarning value={av1} />
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.iconWhenTrue')}</span>
		<input
			type='text'
			onchange={onChange}
			bind:value={icon1}
			placeholder={game.i18n?.localize('obs-utils.strings.iconPlaceholder')}
		/>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.iconWhenFalse')}</span>
		<input
			type='text'
			onchange={onChange}
			bind:value={icon2}
			placeholder={game.i18n?.localize('obs-utils.strings.iconPlaceholder')}
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

	input
		height 32px
		padding 0 8px
		font-size 13px
		border 1px solid rgba(255, 255, 255, 0.15)
		border-radius 3px
		background var(--sidebar-background, transparent)
		color inherit

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.6)
</style>
