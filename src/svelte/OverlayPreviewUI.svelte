<svelte:options runes={true} />
<script lang='ts'>
	import { onDestroy, onMount } from 'svelte';
	import { activateCSSInjection, deactivateCSSInjection } from '../utils/cssInjection.ts';
	import { getApi } from '../utils/helpers.ts';
	import { settings } from '../utils/settings.ts';
	import OverlayHost from './streamoverlays/OverlayHost.svelte';
	import ExternalComponent from './utilities/ExternalComponent.svelte';
	import '../less/streamoverlay.styl';

	onMount(() => activateCSSInjection());
	onDestroy(() => deactivateCSSInjection());

	const overlays = settings.getReadableStore('streamOverlays');
	const actors = settings.getReadableStore('overlayActors');

	const singleInstanceSvelte5 = getApi().singleInstanceOverlaysSvelte5;

	// Fixed reference resolution matching the typical Foundry/OBS stream viewport.
	// Per-WYSIWYG overlays have their own config.w/h, but the preview frame itself
	// is the whole stream — overlays render at their natural positions inside it.
	const REF_W = 1920;
	const REF_H = 1080;
	// Chat sidebar in Foundry sits on the LEFT in the user's setup.
	const CHAT_DEADZONE_W = 305;

	let containerEl: HTMLDivElement;
	let containerWidth = $state(800);
	let containerHeight = $state(450);
	let showBboxes = $state(false);

	$effect(() => {
		if (!containerEl) return;
		const ro = new ResizeObserver((entries) => {
			containerWidth = entries[0].contentRect.width;
			containerHeight = entries[0].contentRect.height;
		});
		ro.observe(containerEl);
		return () => ro.disconnect();
	});

	// "Fit to frame" — preserve aspect ratio, never larger than 1:1.
	const scale = $derived(Math.min(containerWidth / REF_W, containerHeight / REF_H));
	const scaledW = $derived(REF_W * scale);
	const scaledH = $derived(REF_H * scale);
</script>

<div class='preview-root' bind:this={containerEl}>
	<button
		class='bbox-toggle'
		type='button'
		class:active={showBboxes}
		onclick={() => (showBboxes = !showBboxes)}
		title={game.i18n?.localize('obs-utils.applications.overlayPreview.toggleBboxes')}
	>
		<i class='fas fa-vector-square'></i>
		{game.i18n?.localize('obs-utils.applications.overlayPreview.toggleBboxes')}
	</button>
	<!-- Letterbox: the scaled stream sits centered inside the available frame -->
	<div
		class='preview-frame'
		style={`width: ${scaledW}px; height: ${scaledH}px;`}
	>
		<div
			class='preview-canvas'
			style={`width: ${REF_W}px; height: ${REF_H}px; transform: scale(${scale}); transform-origin: top left;`}
		>
			<!-- Render area is offset by the chat deadzone, matching how the overlay container is mounted on /stream -->
			<div
				class='render-area overlay-renderer'
				class:show-bboxes={showBboxes}
				style={`position: absolute; left: ${CHAT_DEADZONE_W}px; top: 0; width: ${REF_W - CHAT_DEADZONE_W}px; height: ${REF_H}px; overflow: hidden;`}
			>
				<OverlayHost actorIDs={$actors} overlays={$overlays} previewMode={true} />
				{#each [...singleInstanceSvelte5] as overlay (overlay)}
					<ExternalComponent ExternalClass={overlay} />
				{/each}
			</div>
			<div
				class='chat-deadzone'
				style={`width: ${CHAT_DEADZONE_W}px;`}
				title={game.i18n?.localize('obs-utils.applications.overlayPreview.chatDeadzoneLabel')}
			></div>
		</div>
	</div>
</div>

<style lang='stylus'>
.preview-root
	width 100%
	height 100%
	background #111
	overflow hidden
	position relative
	display flex
	align-items center
	justify-content center

.preview-frame
	position relative
	background black
	overflow hidden
	box-shadow 0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.4)

.preview-canvas
	position absolute
	top 0
	left 0
	background transparent

.chat-deadzone
	position absolute
	left 0
	top 0
	height 100%
	background rgba(255, 0, 0, 0.08)
	border-right 2px dashed rgba(255, 0, 0, 0.45)
	pointer-events none

.bbox-toggle
	position absolute
	top 8px
	right 8px
	display inline-flex
	align-items center
	gap 6px
	height 28px
	padding 0 10px
	background rgba(0, 0, 0, 0.55)
	border 1px solid rgba(255, 255, 255, 0.18)
	border-radius 4px
	font-size 12px
	color #ddd
	cursor pointer
	z-index 5

	&:hover
		background rgba(0, 0, 0, 0.75)

	&.active
		background rgba(255, 144, 0, 0.18)
		border-color rgba(255, 144, 0, 0.5)
		color #ffce80

// Bounding-box overlay — one box per overlay layer × actor, plus one per
// player for roll overlays. Label = actor / player name pulled from the
// wrapper's own data attribute.
:global(.render-area.show-bboxes .actor-layer)
	position relative
	outline 2px dashed rgba(255, 200, 0, 0.65)
	outline-offset -1px

:global(.render-area.show-bboxes .actor-layer::before)
	content attr(data-actor-name)
	position absolute
	top 0
	left 0
	font-size 11px
	font-weight 600
	letter-spacing 0.4px
	color #fff
	background rgba(255, 144, 0, 0.85)
	padding 2px 6px
	pointer-events none
	z-index 4

:global(.render-area.show-bboxes .roll-instance)
	position relative
	outline 2px dashed rgba(120, 200, 255, 0.7)
	outline-offset -1px

:global(.render-area.show-bboxes .roll-instance::before)
	content attr(data-player-name)
	position absolute
	top 0
	left 0
	font-size 11px
	font-weight 600
	letter-spacing 0.4px
	color #fff
	background rgba(60, 140, 220, 0.85)
	padding 2px 6px
	pointer-events none
	z-index 4
</style>
