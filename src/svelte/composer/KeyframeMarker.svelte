<svelte:options runes={true} />
<script lang='ts'>
	import type { EasingV2 } from '../../utils/overlayAnimation.ts';
	import { kfMarkerClass } from '../../utils/keyframeTimelineRefs.ts';

	const {
		variant,
		leftPx,
		easing,
		selected,
		multiSelected,
		dataKfRef,
		ariaLabel,
		onMousedown,
		onClick,
		onKeydown,
	}: {
		variant: 'aggregate' | 'legacy' | 'prop';
		leftPx: number;
		easing?: EasingV2;
		selected: boolean;
		multiSelected: boolean;
		dataKfRef?: string;
		ariaLabel: string;
		onMousedown: (e: MouseEvent) => void;
		onClick: (e: MouseEvent) => void;
		onKeydown: (e: KeyboardEvent) => void;
	} = $props();

	function resolveMarkerClass(): string {
		if (variant === 'aggregate') return 'kf-marker kf-bezier kf-aggregate';
		if (variant === 'legacy') return `${kfMarkerClass(undefined)} kf-legacy`;
		return kfMarkerClass(easing);
	}
	const markerClass = $derived(resolveMarkerClass());
</script>

<div
	class={markerClass}
	class:selected={selected}
	class:multi-selected={multiSelected}
	style={`left: ${leftPx}px;`}
	data-kf-ref={dataKfRef}
	onmousedown={onMousedown}
	onclick={onClick}
	onkeydown={onKeydown}
	role='button'
	tabindex='0'
	aria-label={ariaLabel}
></div>

<style lang='stylus'>
	.kf-marker
		position absolute
		top 3px
		width 14px
		height 14px
		margin-left -7px
		cursor grab

		&::before
			content ''
			position absolute
			inset -6px
			cursor inherit

		&:active
			cursor grabbing

		&.selected
			filter brightness(1.5)
			z-index 1

		&.multi-selected
			outline 2px solid rgba(120, 200, 255, 0.9)
			outline-offset 1px
			z-index 1

	.kf-bezier
		background rgba(255, 200, 80, 0.7)
		border 1.5px solid rgba(255, 230, 140, 0.9)
		border-radius 50%

		&.selected
			border-color white
			border-width 2px

	.kf-eq-back
		background rgba(150, 110, 220, 0.78)
		border-color rgba(190, 150, 250, 0.95)
	.kf-eq-bounce
		background rgba(110, 200, 130, 0.78)
		border-color rgba(150, 240, 170, 0.95)
	.kf-eq-elastic
		background rgba(230, 100, 200, 0.78)
		border-color rgba(255, 140, 230, 0.95)

	.kf-linear
		background rgba(100, 200, 255, 0.75)
		border none
		border-radius 0
		clip-path polygon(0% 0%, 100% 50%, 0% 100%)

		&.selected
			background rgba(140, 230, 255, 1)

	.kf-constant
		background rgba(160, 160, 200, 0.7)
		border 1.5px solid rgba(200, 200, 255, 0.9)
		border-radius 2px

		&.selected
			background rgba(200, 200, 255, 0.95)

	.kf-aggregate
		width 10px
		height 10px
		top 5px
		margin-left -5px
		opacity 0.5
		background rgba(255, 144, 0, 0.4)
		border-color rgba(255, 200, 80, 0.5)

	.kf-legacy
		opacity 0.85
</style>
