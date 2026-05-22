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
	const icon1 = $derived(String(values.icon1 ?? ''));
	const icon2 = $derived(String(values.icon2 ?? ''));
</script>

<div
	class='component actor-val-component multi-icon-component'
	id={`component${componentIndex.toString()}`}
	data-component-id={componentId}
	style={style}
	data-value1={value1.toString()}
	data-value2={value2.toString()}
>
	{#each Array.from({ length: value1 }, (_, i) => i + 1) as i (i)}
		<i class='{icon1} icon-{i}'></i>
	{/each}
	{#each Array.from({ length: value2 }, (_, i) => i + 1) as i (i)}
		<i class='{icon2} icon-{value1 + i}'></i>
	{/each}
</div>
