<svelte:options runes={true} />
<script lang='ts'>
	import Select from '../select/Select.svelte';
	import { getActorValueGroups } from '../../../utils/helpers';

	let { data = $bindable('') } = $props<{ data: string }>();
	const groups = getActorValueGroups();
</script>

<Select
	options={groups}
	bind:value={data}
	creatable={true}
	placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
/>
