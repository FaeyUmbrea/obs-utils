<script>
	import { localize } from '#runtime/util/i18n';

	import Select from 'svelte-select';
	import { getActorValues } from '../../../utils/helpers';

	export let data = '';
	let av1, av2, icon1, icon2;
	const values = getActorValues();
	let items = [...values];
	let items2 = [...values];

	let filterText = '';
	let filterText2 = '';

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

{getSplit()}
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
		on:filter={handleFilter}
		value={av1}
		on:change={onChange}
		placeholder={localize('obs-utils.strings.avInputPlaceholder')}
	/>
	<input
		type='text'
		on:change={onChange}
		bind:value={icon1}
		placeholder={localize('obs-utils.strings.iconPlaceholder')}
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
		on:filter={handleFilter2}
		value={av2}
		on:change={onChange}
		placeholder={localize('obs-utils.strings.avInputPlaceholder')}
	/>
	<input
		type='text'
		on:change={onChange}
		bind:value={icon2}
		placeholder={localize('obs-utils.strings.iconPlaceholder')}
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
