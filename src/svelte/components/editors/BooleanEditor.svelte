<svelte:options runes={true} />
<script lang='ts'>
	import Svelecte from 'svelecte';
	import { getActorValues } from '../../../utils/helpers';

	let { data = $bindable(';;') } = $props<{ data: string }>();

	let av1 = $state(data.split(';')[0] ?? '');
	let icon1 = $state(data.split(';')[1] ?? '');
	let icon2 = $state(data.split(';')[2] ?? '');
	const values = getActorValues();
	// eslint-disable-next-line svelte/valid-compile
	if (av1 !== null && !values.find(v => v.value === av1)) {
		// eslint-disable-next-line svelte/valid-compile
		values.push({ value: av1, label: av1 });
	}

	function onChange() {
		data = `${av1 ?? ''};${icon1 ?? ''};${icon2 ?? ''}`;
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
	<div class='labeled'>
		<label for='bool-icon1'>{game.i18n.localize('obs-utils.strings.true')}</label>
		<input
			id='bool-icon1'
			type='text'
			onchange={onChange}
			bind:value={icon1}
		/>
	</div>
	<div class='labeled'>
		<label for='bool-icon2'>{game.i18n.localize('obs-utils.strings.false')}</label>
		<input
			id='bool-icon2'
			type='text'
			onchange={onChange}
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
