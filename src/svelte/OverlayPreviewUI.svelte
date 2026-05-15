<svelte:options runes={true} />
<script lang='ts'>
	import type { SvelteApplication } from '../applications/mixin.svelte.ts';
	import { getApi } from '../utils/helpers.ts';
	import { settings } from '../utils/settings.ts';
	import PerActorOverlay from './streamoverlays/PerActorOverlay.svelte';
	import ExternalComponent from './utilities/ExternalComponent.svelte';

	const { foundryApp } = $props<{ foundryApp: SvelteApplication }>();

	const overlays = settings.getReadableStore('streamOverlays');
	const actors = settings.getReadableStore('overlayActors');

	const singleInstanceSvelte5 = getApi().singleInstanceOverlaysSvelte5;

	const refW = $derived(
		($overlays as any[])?.find(o => o.type === 'wysiwyg')?.config?.w ?? 1920
	);
	const refH = $derived(
		($overlays as any[])?.find(o => o.type === 'wysiwyg')?.config?.h ?? 1080
	);

	let containerEl: HTMLDivElement;
	let containerWidth = $state(800);
	let containerHeight = $state(450);

	$effect(() => {
		if (!containerEl) return;
		const ro = new ResizeObserver(entries => {
			containerWidth = entries[0].contentRect.width;
			containerHeight = entries[0].contentRect.height;
		});
		ro.observe(containerEl);
		return () => ro.disconnect();
	});

	const scale = $derived(Math.min(containerWidth / refW, containerHeight / refH));
</script>

<div class='preview-root' bind:this={containerEl}>
	<div
		class='preview-canvas'
		style={`width: ${refW}px; height: ${refH}px; transform: scale(${scale}); transform-origin: top left;`}
	>
		<PerActorOverlay actorIDs={$actors} overlays={$overlays} />
		{#each [...singleInstanceSvelte5] as overlay}
			<ExternalComponent ExternalClass={overlay} />
		{/each}
		<div class='chat-deadzone' title={game.i18n?.localize('obs-utils.applications.overlayPreview.chatDeadzoneLabel')}></div>
	</div>
</div>

<style lang='stylus'>
.preview-root
	width 100%
	height 100%
	background black
	overflow hidden
	position relative

.preview-canvas
	position absolute
	top 0
	left 0
	background transparent

.chat-deadzone
	position absolute
	right 0
	top 0
	width 305px
	height 100%
	background rgba(255, 0, 0, 10%)
	border-left 2px dashed rgba(255, 0, 0, 40%)
	pointer-events none
</style>
