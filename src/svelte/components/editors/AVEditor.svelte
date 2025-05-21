<script>
	import { localize } from '#runtime/util/i18n';

	import Select from 'svelte-select';
	import { getActorValues } from '../../../utils/helpers';

	export let data;
	const values = getActorValues();
	let items = [...values];

	let filterText = '';

	function handleFilter(e) {
		if (e.detail.length === 0 && filterText.length > 0) {
			items = [...values, filterText];
		}
	}
</script>

<Select
	--background='var(--sidebar-background)'
	--list-background='var(--sidebar-background)'
	--item-hover-bg='var(--sidebar-entry-hover-bg)'
	--height='30px'
	bind:filterText={filterText}
	bind:justValue={data}
	closeListOnChange='false'
	floatingConfig={{
		strategy: 'fixed',
	}}
	items={items}
	on:filter={handleFilter}
	value={data}
	placeholder={localize('obs-utils.strings.avInputPlaceholder')}
/>
