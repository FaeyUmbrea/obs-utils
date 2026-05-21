<svelte:options runes={true} />
<script lang='ts'>
	import type { ResolvedValues } from '../../../utils/render.ts';

	const { values, style, componentIndex }: {
		values: ResolvedValues;
		style: string;
		componentIndex: number;
	} = $props();

	const truthy = $derived(!!values.value);
	const image1 = $derived(String(values.image1 ?? ''));
	const image2 = $derived(String(values.image2 ?? ''));
</script>

<div
	class='component actor-val-component bool-component bool-{truthy.toString()} image-component'
	id={`component${componentIndex.toString()}`}
	data-value={truthy.toString()}
	style={style}
>
	{#if truthy && image1 !== ''}
		<img alt='actor value img renderer' src={image1} />
	{:else if !truthy && image2 !== ''}
		<img alt='actor value img renderer' src={image2} />
	{/if}
</div>
