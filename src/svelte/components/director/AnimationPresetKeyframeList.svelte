<svelte:options runes={true} />
<script lang='ts'>
	import type { CameraKeyframe } from '../../../utils/cameraPresets.ts';

	interface Props {
		keyframes: CameraKeyframe[];
		selectedIndices: number[];
		onAdd: () => void;
	}
	let {
		keyframes,
		selectedIndices = $bindable(),
		onAdd,
	}: Props = $props();

	const LOC = (key: string) => game.i18n?.localize(`obs-utils.applications.director.keyframeEditor.${key}`) ?? key;

	function formatSeconds(ms: number): string {
		return `${(ms / 1000).toFixed(2)}s`;
	}

	function isSelected(idx: number): boolean {
		return selectedIndices.includes(idx);
	}
	function selectOnly(idx: number) {
		selectedIndices = [idx];
	}
	function selectToggle(idx: number) {
		selectedIndices = isSelected(idx)
			? selectedIndices.filter(i => i !== idx)
			: [...selectedIndices, idx].sort((a, b) => a - b);
	}
	function selectClick(idx: number, additive: boolean) {
		if (additive) selectToggle(idx);
		else selectOnly(idx);
	}
</script>

<aside class='ape-list'>
	<header class='list-head'>
		<h4>{LOC('keyframes')}</h4>
		<span class='count'>{keyframes.length}</span>
		<button
			type='button'
			class='list-add'
			onclick={onAdd}
			title={LOC('addAtPlayhead')}
			aria-label={LOC('addAtPlayhead')}
		><i class='fas fa-plus'></i></button>
	</header>
	<ul>
		{#each keyframes as kf, idx (`${kf.time}-${idx}`)}
			<li>
				<button
					type='button'
					class='list-row'
					class:selected={isSelected(idx)}
					data-kf-idx={idx}
					onclick={e => selectClick(idx, e.ctrlKey || e.metaKey)}
				>
					<span class='kf-t'>{formatSeconds(kf.time)}</span>
					<span class='kf-pos'>{kf.x}, {kf.y}</span>
					<span class='kf-scale'>×{kf.scale.toFixed(2)}</span>
				</button>
			</li>
		{/each}
		{#if keyframes.length === 0}
			<li class='empty'>{LOC('noKeyframes')}</li>
		{/if}
	</ul>
</aside>

<style lang='stylus'>
	.ape-list
		display flex
		flex-direction column
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden

		.list-head
			display flex
			align-items center
			gap 6px
			padding 6px 8px
			border-bottom 1px solid rgba(255, 255, 255, 0.08)
			flex 0 0 auto

			h4
				margin 0
				flex 1 1 auto
				font-size 11px
				font-weight 600
				text-transform uppercase
				letter-spacing 0.4px
				opacity 0.7

			.count
				font-size 11px
				opacity 0.6

			.list-add
				display inline-flex
				align-items center
				justify-content center
				width 20px
				height 20px
				padding 0
				background transparent
				border 1px solid rgba(255, 255, 255, 0.15)
				border-radius 3px
				color rgba(255, 255, 255, 0.7)
				cursor pointer
				font-size 10px

				&:hover
					background rgba(255, 144, 0, 0.18)
					border-color rgba(255, 144, 0, 0.45)
					color rgba(255, 200, 80, 1)

		ul
			list-style none
			margin 0
			padding 4px
			overflow-y auto
			flex 1 1 auto
			display flex
			flex-direction column
			gap 2px

			.empty
				padding 16px 8px
				font-size 11px
				opacity 0.5
				font-style italic
				text-align center

	.list-row
		display grid
		grid-template-columns 1fr auto auto
		gap 6px
		align-items center
		width 100%
		padding 6px 8px
		background transparent
		border 1px solid transparent
		border-radius 3px
		font-size 11px
		font-family monospace
		text-align left
		cursor pointer

		.kf-t
			color #ffce80

		.kf-pos
			opacity 0.75

		.kf-scale
			opacity 0.55

		&:hover
			background rgba(255, 255, 255, 0.05)

		&.selected
			background rgba(255, 144, 0, 0.18)
			border-color rgba(255, 144, 0, 0.45)
</style>
