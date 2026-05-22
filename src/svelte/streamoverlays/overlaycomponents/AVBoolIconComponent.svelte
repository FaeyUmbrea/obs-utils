<svelte:options runes={true} />
<script lang='ts'>
	import type { ResolvedValues } from '../../../utils/render.ts';

	const { values, style, componentIndex, componentId }: {
		values: ResolvedValues;
		style: string;
		componentIndex: number;
		componentId?: string;
	} = $props();

	const truthy = $derived(!!values.value);
</script>

<div
	class='component actor-val-component bool-component bool-{truthy.toString()} fa-icon-component'
	id={`component${componentIndex.toString()}`}
	data-component-id={componentId}
	data-value={truthy.toString()}
	style={style}
>
	{#if truthy}
		<i class={String(values.icon1 ?? 'fa-solid fa-check')}></i>
	{:else}
		<i class={String(values.icon2 ?? 'fa-solid fa-x')}></i>
	{/if}
</div>
