<svelte:options runes={true} />
<script lang='ts'>
	import type { ResolvedValues } from '../../../utils/render.ts';

	const { values, style, componentIndex }: {
		values: ResolvedValues;
		style: string;
		componentIndex: number;
	} = $props();
</script>

<div
	class='component actor-val-component image-component'
	id={`component${componentIndex.toString()}`}
	style={style}
	data-value={String(values.value ?? '')}
>
	<img alt='actor value img renderer' src={String(values.value ?? '')} />
</div>
