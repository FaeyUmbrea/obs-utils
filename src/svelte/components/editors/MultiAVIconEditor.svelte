<svelte:options runes={true} />
<script lang='ts'>
	import Svelecte from 'svelecte';
	import { ensureCustomValue, getActorValueGroups } from '../../../utils/helpers';

	let { data = $bindable(';;;') } = $props<{ data: string }>();
	let valuePath = $state(data?.split(';')[0] ?? '');
	let filledIcon = $state(data?.split(';')[1] ?? '');
	let maxPath = $state(data?.split(';')[2] ?? '');
	let emptyIcon = $state(data?.split(';')[3] ?? '');

	const values = getActorValueGroups();
	ensureCustomValue(values, valuePath);
	ensureCustomValue(values, maxPath);

	function onChange() {
		data = `${valuePath ?? ''};${filledIcon ?? ''};${maxPath ?? ''};${emptyIcon ?? ''}`;
	}
</script>

<div class='editor'>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.valuePath')}</span>
		<Svelecte
			--sv-bg='var(--sidebar-background)'
			--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
			--sv-min-height='32px'
			floatingConfig={{ strategy: 'fixed' }}
			creatable={true}
			creatablePrefix=""
			options={values}
			bind:value={valuePath}
			onChange={onChange}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	</label>
	<label class='row'>
		<span class='lbl'>{game.i18n?.localize('obs-utils.applications.componentEditors.maxPath')}</span>
		<Svelecte
			--sv-bg='var(--sidebar-background)'
			--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
			--sv-min-height='32px'
			floatingConfig={{ strategy: 'fixed' }}
			creatable={true}
			creatablePrefix=""
			options={values}
			bind:value={maxPath}
			onChange={onChange}
			placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
		/>
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
