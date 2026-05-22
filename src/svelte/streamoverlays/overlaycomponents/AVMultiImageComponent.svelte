<svelte:options runes={true} />
<script lang='ts'>
	import type { ResolvedValues } from '../../../utils/render.ts';

	const { values, style, componentIndex, componentId }: {
		values: ResolvedValues;
		style: string;
		componentIndex: number;
		componentId?: string;
	} = $props();

	const value1 = $derived(Number(values.value1 ?? 0));
	const value2 = $derived(Number(values.value2 ?? 0));
	const image1 = $derived(String(values.image1 ?? ''));
	const image2 = $derived(String(values.image2 ?? ''));
</script>

<div
	class='component actor-val-component multi-image-component'
	id={`component${componentIndex.toString()}`}
	data-component-id={componentId}
	data-value1={value1.toString()}
	data-value2={value2.toString()}
	style={style}
>
	{#each Array.from({ length: value1 }, (_, i) => i + 1) as i (i)}
		<img alt='actor value multi img renderer image-{i}' src={image1} />
	{/each}
	{#each Array.from({ length: value2 }, (_, i) => i + 1) as i (i)}
		<img alt='actor value multi img renderer image-{value1 + i}' src={image2} />
	{/each}
</div>
