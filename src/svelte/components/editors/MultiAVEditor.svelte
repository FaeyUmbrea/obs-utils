<svelte:options runes={true} />
<script lang='ts'>
	import Svelecte from 'svelecte';
	import { ensureCustomValue, getActorValueGroups } from '../../../utils/helpers';

	let { data = $bindable(';') } = $props<{ data: string }>();
	let valuePath = $state(data?.split(';')[0] ?? null);
	let maxPath = $state(data?.split(';')[1] ?? null);
	const values = getActorValueGroups();
	ensureCustomValue(values, valuePath);
	ensureCustomValue(values, maxPath);

	function onChange() {
		data = `${valuePath};${maxPath}`;
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
