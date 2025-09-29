<svelte:options runes={true} />

<script lang='ts'>

	import Select from 'svelte-select';
	import { getActorValues } from '../../../utils/helpers';

	let { data } = $props<{ data: string }>();
	let av1 = $state(data.split(';')[0]);
	let av2 = $state(data.split(';')[1]);
	const values = getActorValues();
	let items = $state([...values]);
	let items2 = $state([...values]);

	let filterText = $state('');
	let filterText2 = $state('');

	function onChange() {
		data = `${av1};${av2}`;
	}

	function handleFilter(e) {
		if (e.detail.length === 0 && filterText.length > 0) {
			items = [...values, filterText];
		}
	}

	function handleFilter2(e) {
		if (e.detail.length === 0 && filterText2.length > 0) {
			items2 = [...values, filterText2];
		}
	}
</script>

<div class='input'>
	<Select
		--background='var(--sidebar-background)'
		--list-background='var(--sidebar-background)'
		--item-hover-bg='var(--sidebar-entry-hover-bg)' --height='30px'
		bind:filterText={filterText}
		bind:justValue={av1}
		closeListOnChange='false'
		floatingConfig={{
			strategy: 'fixed',
		}}
		items={items}
		onfilter={handleFilter}
		value={av1}
		onchange={onChange}
		placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
	/>
	<Select
		--background='var(--sidebar-background)'
		--list-background='var(--sidebar-background)'
		--item-hover-bg='var(--sidebar-entry-hover-bg)'
		--height='30px'
		bind:filterText={filterText2}
		bind:justValue={av2}
		closeListOnChange='false'
		floatingConfig={{
			strategy: 'fixed',
		}}
		items={items2}
		on:filter={handleFilter2}
		value={av2}
		on:change={onChange}
		placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
	/>
</div>

<style lang='stylus'>
  .input {
    display grid;
    grid-column-start span 2;
    grid-template-columns auto;
    grid-template-rows auto auto;
  }
</style>
