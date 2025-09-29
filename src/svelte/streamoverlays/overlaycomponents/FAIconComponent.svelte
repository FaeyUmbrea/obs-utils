<svelte:options runes={true} />
<script>
	let { data = $bindable(''), style = $bindable(), componentIndex = $bindable() } = $props();
</script>

<div
	class='component fa-icon-component'
	id={`component${componentIndex.toString()}`}
	style={style}
>
	<i class={data}></i>
</div>
