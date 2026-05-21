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
	class='component fa-icon-component'
	id={`component${componentIndex.toString()}`}
	data-value={String(values.value ?? '')}
	style={style}
>
	<i class={String(values.value ?? '')}></i>
</div>
