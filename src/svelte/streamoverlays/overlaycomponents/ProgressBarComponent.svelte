<svelte:options runes={true} />
<script lang='ts'>
	import type { ResolvedValues } from '../../../utils/render.ts';

	const { values, style, componentIndex }: {
		values: ResolvedValues;
		style: string;
		componentIndex: number;
	} = $props();

	const value = $derived(Number(values.value ?? 0));
	const max = $derived(Number(values.max ?? 1));
</script>

<div
	class='component actor-val-component progress-bar-component'
	id={`component${componentIndex.toString()}`}
	data-value={value.toString()}
	data-max={max.toString()}
	style={style}
>
	<progress
		value={Number.isNaN(value) || !Number.isFinite(value) ? 0.5 : value}
		max={Number.isNaN(max) || !Number.isFinite(max) ? 1 : max}
	></progress>
</div>
