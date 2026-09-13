<svelte:options runes={true} />
<script lang='ts'>
	import { onMount } from 'svelte';
	import { getFontAwesomeIcons } from '../../../utils/iconExtractor.ts';

	let { value = $bindable(), onClose } = $props<{ value: string; onClose: () => void }>();

	let icons = $state<string[]>([]);
	let filter = $state('');

	onMount(() => {
		icons = getFontAwesomeIcons();
	});

	const filteredIcons = $derived(
		filter.trim() === ''
			? icons
			: icons.filter(i => i.toLowerCase().includes(filter.toLowerCase())),
	);

	function selectIcon(icon: string) {
		value = `fa-solid ${icon}`;
		onClose();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class='icon-picker-backdrop' onclick={onClose}>
	<div class='icon-picker-modal' onclick={e => e.stopPropagation()}>
		<header>
			<input type='text' placeholder='Search icons...' bind:value={filter} autofocus />
			<button class='close-btn' type='button' onclick={onClose} title='Close'>
				<i class='fas fa-times'></i>
			</button>
		</header>
		<div class='icon-grid'>
			{#if filteredIcons.length === 0}
				<div class='empty'>No icons found.</div>
			{/if}
			{#each filteredIcons as icon (icon)}
				<button class='icon-btn' type='button' onclick={() => selectIcon(icon)} title={icon}>
					<i class='fas {icon}'></i>
				</button>
			{/each}
		</div>
	</div>
</div>

<style lang='stylus'>
	.icon-picker-backdrop
		position fixed
		top 0
		left 0
		width 100vw
		height 100vh
		z-index 1000
		background rgba(0, 0, 0, 0.5)
		display flex
		align-items center
		justify-content center

	.icon-picker-modal
		width 400px
		height 500px
		background var(--window-background, #1e1e1e)
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 5px
		box-shadow 0 10px 30px rgba(0, 0, 0, 0.5)
		display flex
		flex-direction column
		overflow hidden

	header
		padding 10px
		display flex
		gap 10px
		background rgba(0, 0, 0, 0.2)
		border-bottom 1px solid rgba(255, 255, 255, 0.05)

		input
			flex 1 1 auto
			height 30px
			padding 0 10px
			background rgba(0, 0, 0, 0.3)
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			color white
			font-size 14px

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.6)

		.close-btn
			flex 0 0 30px
			height 30px
			background transparent
			border none
			cursor pointer
			opacity 0.6
			color white

			&:hover
				opacity 1

	.icon-grid
		flex 1 1 auto
		overflow-y auto
		padding 10px
		display grid
		grid-template-columns repeat(auto-fill, minmax(40px, 1fr))
		gap 6px
		align-content start

	.empty
		grid-column 1 / -1
		text-align center
		padding 20px
		opacity 0.5
		font-style italic

	.icon-btn
		aspect-ratio 1
		background rgba(255, 255, 255, 0.05)
		border 1px solid rgba(255, 255, 255, 0.05)
		border-radius 4px
		display flex
		align-items center
		justify-content center
		cursor pointer
		color inherit
		padding 0
		transition all 0.2s

		i
			font-size 18px

		&:hover
			background rgba(255, 144, 0, 0.2)
			border-color rgba(255, 144, 0, 0.4)
			transform scale(1.1)
</style>
