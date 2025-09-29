<svelte:options runes={true} />

<script lang='ts'>

	import Select from 'svelte-select';
	import { getActorValues } from '../../../utils/helpers';

	let { data } = $props<{ data: string }>();
	let av1 = $state();
	let av2 = $state();
	let icon1 = $state();
	let icon2 = $state();
	const values = getActorValues();
	let items = $state([...values]);
	let items2 = $state([...values]);

	let filterText = $state('');
	let filterText2 = $state('');

	function onChange() {
		data = `${av1};${icon1};${av2};${icon2}`;
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

	function getSplit() {
		av1 = data.split(';')[0];
		icon1 = data.split(';')[1];
		av2 = data.split(';')[2];
		icon2 = data.split(';')[3];
		return '';
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
	<input
		type='text'
		onchange={onChange}
		bind:value={icon1}
		placeholder={game.i18n.localize('obs-utils.strings.iconPlaceholder')}
	/>
	<Select
		--background='var(--sidebar-background)'
		--list-background='var(--sidebar-background)'
		--item-hover-bg='var(--sidebar-entry-hover-bg)' --height='30px'
		bind:filterText={filterText2}
		bind:justValue={av2}
		closeListOnChange='false'
		floatingConfig={{
			strategy: 'fixed',
		}}
		items={items2}
		onfilter={handleFilter2}
		value={av2}
		onchange={onChange}
		placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
	/>
	<input
		type='text'
		onchange={onChange}
		bind:value={icon2}
		placeholder={game.i18n.localize('obs-utils.strings.iconPlaceholder')}
	/>
</div>

<style lang='stylus'>
  .input {
    display grid;
    grid-column-start span 2;
    grid-template-columns 5fr 2fr;
    grid-template-rows auto auto;
  }
  input {
    padding-left: 10px;
    height: 100%;
    width: 100%;
    font-size: 16px;
    font-family: inherit;
    border: 1px solid #d8dbdf;
    border-radius: 6px;
  }
</style>
