<svelte:options runes={true} />

<script lang='ts'>

	import Svelecte from 'svelecte';

	import { getActorValues } from '../../../utils/helpers';

	let { data = $bindable(';;;') } = $props<{ data: string }>();
	let av1 = $state(data.split(';')[0] ?? null);
	let av2 = $state(data.split(';')[2] ?? null);
	let icon1 = $state(data.split(';')[1] ?? null);
	let icon2 = $state(data.split(';')[3] ?? null);
	const values = getActorValues();
	// eslint-disable-next-line svelte/valid-compile
	if (av1 !== null && !values.find(v => v.value === av1)) {
		// eslint-disable-next-line svelte/valid-compile
		values.push({ value: av1, label: av1 });
	}
	// eslint-disable-next-line svelte/valid-compile
	if (av2 !== null && !values.find(v => v.value === av2)) {
		// eslint-disable-next-line svelte/valid-compile
		values.push({ value: av2, label: av2 });
	}

	function onChange() {
		data = `${av1};${icon1};${av2};${icon2}`;
	}

</script>

<div class='input'>
	<Svelecte
		--sv-bg='var(--sidebar-background)'
		--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
		--sv-min-height='35px'
		floatingConfig={{
			strategy: 'fixed',
		}}
		creatable={true}
		creatablePrefix=""
		options={values}
		bind:value={av1}
		onChange={onChange}
		placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
	/>
	<input
		type='text'
		onchange={onChange}
		bind:value={icon1}
		placeholder={game.i18n?.localize('obs-utils.strings.iconPlaceholder')}
	/>
	<Svelecte
		--sv-bg='var(--sidebar-background)'
		--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
		--sv-min-height='35px'
		floatingConfig={{
			strategy: 'fixed',
		}}
		creatable={true}
		creatablePrefix=""
		options={values}
		bind:value={av2}
		onChange={onChange}
		placeholder={game.i18n?.localize('obs-utils.strings.avInputPlaceholder')}
	/>
	<input
		type='text'
		onchange={onChange}
		bind:value={icon2}
		placeholder={game.i18n?.localize('obs-utils.strings.iconPlaceholder')}
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
