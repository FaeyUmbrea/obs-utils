<svelte:options runes={true} />
<script lang='ts'>
	import Svelecte from 'svelecte';
	import { getActorValues } from '../../../utils/helpers';

	let { data = $bindable() } = $props<{ data: string }>();
	const values = getActorValues();
	if (data !== null && !values.find(v => v.value === data)) {
		values.push({ value: data, label: data, $created: true });
	}
</script>

<Svelecte
	--sv-bg='var(--sidebar-background)'
	--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
	--sv-min-height='35px'
	options={values}
	bind:value={data}
	labelField='label'
	valueField='value'
	creatable={true}
	creatablePrefix=""
	placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
/>
