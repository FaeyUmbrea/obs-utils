<svelte:options runes={true} />
<script lang='ts'>
	import IconPickerPopup from './IconPickerPopup.svelte';

	let { value = $bindable(), placeholder = '', onchange } = $props<{ value: string; placeholder?: string; onchange?: (e: Event) => void }>();

	let pickerOpen = $state(false);

	function handleOnChange(e: Event) {
		if (onchange) onchange(e);
	}
</script>

<div class='icon-input-wrapper'>
	<input
		type='text'
		bind:value
		{placeholder}
		onchange={handleOnChange}
	/>
	<button type='button' class='picker-btn' onclick={() => (pickerOpen = !pickerOpen)} title='Pick Icon'>
		<i class={value || 'fas fa-icons'}></i>
	</button>

	{#if pickerOpen}
		<IconPickerPopup bind:value onClose={() => {
			pickerOpen = false;
			if (onchange) onchange(new Event('change'));
		}} />
	{/if}
</div>

<style lang='stylus'>
	.icon-input-wrapper
		position relative
		display flex
		gap 4px
		flex 1 1 auto

		input
			flex 1 1 auto
			width 100%
			height 32px
			padding 0 8px
			font-size 13px
			border 1px solid rgba(255, 255, 255, 0.15)
			border-radius 3px
			background var(--sidebar-background, transparent)
			color inherit

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.6)

		.picker-btn
			flex 0 0 32px
			width 32px
			height 32px
			padding 0
			display flex
			align-items center
			justify-content center
			background rgba(255, 255, 255, 0.05)
			border 1px solid rgba(255, 255, 255, 0.15)
			border-radius 3px
			cursor pointer

			&:hover
				background rgba(255, 255, 255, 0.1)

			i
				font-size 14px
</style>
