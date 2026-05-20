<svelte:options runes={true} />
<script lang='ts'>
	import Svelecte from 'svelecte';
	import { ensureCustomValue, getActorValueGroups } from '../../../utils/helpers';

	let { data = $bindable('') } = $props<{ data: string }>();
	const values = ensureCustomValue(getActorValueGroups(), data);
</script>

<Svelecte
	--sv-bg='var(--sidebar-background)'
	--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
	--sv-min-height='35px'
	floatingConfig={{ strategy: 'fixed' }}
	options={values}
	bind:value={data}
	labelField='label'
	valueField='value'
	creatable={true}
	creatablePrefix=""
	placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
/>
