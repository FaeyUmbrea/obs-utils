<script>

	import Select from 'svelte-select';
	import { getActorValues } from '../../../utils/helpers';

	export let data = '';
	let av1, icon1, icon2;
	const values = getActorValues();
	let items = [...values];

	let filterText = '';

	function onChange() {
		data = `${av1};${icon1};${icon2}`;
	}

	function handleFilter(e) {
		if (e.detail.length === 0 && filterText.length > 0) {
			items = [...values, filterText];
		}
	}

	function getSplit() {
		av1 = data.split(';')[0];
		icon1 = data.split(';')[1];
		icon2 = data.split(';')[2];
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
		placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
	/>
	<div class='labeled'>
		<label for='bool-icon1'>{game.i18n.localize('obs-utils.strings.true')}</label>
		<input
			id='bool-icon1'
			type='text'
			on:change={onChange}
			bind:value={icon1}
		/>
	</div>
	<div class='labeled'>
		<label for='bool-icon2'>{game.i18n.localize('obs-utils.strings.false')}</label>
		<input
			id='bool-icon2'
			type='text'
			on:change={onChange}
			bind:value={icon2}
		/>
	</div>
</div>

<style lang='stylus'>
  .input {
    display grid;
    grid-column-start span 2;
    grid-template-columns auto;
    grid-template-rows auto auto;
  }

  .labeled {
    display grid;
    grid-template-columns 50px auto;

    label {
      display flex;
      justify-content center;
      position relative;
      top 5px;
    }
  }
</style>
