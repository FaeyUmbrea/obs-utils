<svelte:options runes={true} />
<script lang='ts'>
	import Select from 'svelte-select';
	import { getActorValues } from '../../../utils/helpers';

	let { data } = $props<{ data: string }>();
	const values = getActorValues();
	let items = $state<string[]>([...values]);

	let filterText = $state('');

	function handleFilter(e: CustomEvent<{ length: number }>) {
		if ((e as any).detail?.length === 0 && filterText.length > 0) {
			items = [...values, { value: filterText, label: filterText, created: true }];
		}
	}

	function handleChange(e) {
		items = items.map((i) => {
			delete i.created;
			return i;
		});
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
	bind:items={items}
	on:filter={handleFilter}
	on:change={handleChange}
	value={data}
	placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
/>
