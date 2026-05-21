<svelte:options runes={true} />
<script lang='ts'>
	import Select from '../select/Select.svelte';
	import { getDataPickerGroups } from '../../../utils/helpers';
	import TriggerPathWarning from './TriggerPathWarning.svelte';

	let { data = $bindable(';;;') } = $props<{ data: string }>();
	let valuePath = $state(data?.split(';')[0] ?? '');
	let filledIcon = $state(data?.split(';')[1] ?? '');
	let maxPath = $state(data?.split(';')[2] ?? '');
	let emptyIcon = $state(data?.split(';')[3] ?? '');

	const groups = getDataPickerGroups();

	function onChange() {
		data = `${valuePath ?? ''};${filledIcon ?? ''};${maxPath ?? ''};${emptyIcon ?? ''}`;
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
		<TriggerPathWarning value={valuePath} />
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.maxPath')}</span>
		<Select
			options={groups}
			bind:value={() => maxPath, v => { maxPath = (v as string) ?? ''; onChange(); }}
			creatable={true}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
		<TriggerPathWarning value={maxPath} />
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.filledIcon')}</span>
		<input
			type='text'
			onchange={onChange}
			bind:value={filledIcon}
			placeholder={game.i18n?.localize('obs-utils.strings.iconPlaceholder')}
		/>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.emptyIcon')}</span>
		<input
			type='text'
			onchange={onChange}
			bind:value={emptyIcon}
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
