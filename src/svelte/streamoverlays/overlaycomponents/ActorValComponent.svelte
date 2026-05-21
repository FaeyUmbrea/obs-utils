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
	class='component actor-val-component'
	id={`component${componentIndex.toString()}`}
	data-value={String(values.value ?? '')}
	style={style}
>
	{values.value ?? ''}
</div>
