<svelte:options runes={true} />
<script lang='ts'>
	import type { SvelteApplication } from '../../applications/mixin.svelte.ts';
	import type { CameraPreset } from '../../utils/cameraPresets.ts';
	import { onMount } from 'svelte';
	import { readPresets, writePresets } from '../../utils/cameraPresets.ts';
	import AnimationPresetEditor from '../components/director/AnimationPresetEditor.svelte';

	// Note: the prop is intentionally renamed away from `state` — the mixin
	// passes the app state under `state`, but Svelte 5 treats anything that
	// happens to start with `$state.` syntactically as the rune, which trips
	// `store_invalid_shape` validation at runtime. The mixin spreads the
	// context so we can read it from `appState` here.
	const { foundryApp, state: appState }: {
		foundryApp: SvelteApplication;
		state: { presetId: string; sceneId: string };
	} = $props();

	let scene = $state<unknown>(null);
	let presets = $state<CameraPreset[]>([]);

	onMount(() => {
		const scenes = (game as { scenes?: { get?: (id: string) => unknown } }).scenes;
		scene = scenes?.get?.(appState.sceneId) ?? null;
		if (scene) presets = readPresets(scene);
	});

	const preset = $derived(presets.find(p => p.id === appState.presetId) ?? null);

	function onPresetsChange(next: CameraPreset[]) {
		presets = next;
		if (scene) writePresets(scene, next).catch(() => {});
	}

	async function close() {
		await foundryApp.close();
	}
</script>

<main class='anim-preset-app'>
	{#if preset}
		<AnimationPresetEditor
			{preset}
			{presets}
			{scene}
			onClose={close}
			{onPresetsChange}
		/>
	{:else}
		<div class='not-found'>
			<i class='fas fa-bookmark'></i>
			<p>{game.i18n?.localize('obs-utils.applications.director.presetNotFound') ?? 'Preset not found.'}</p>
		</div>
	{/if}
</main>

<style>
	.anim-preset-app {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 6px;
	}
	.not-found {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		flex: 1 1 auto;
		opacity: 0.7;
	}
	.not-found i {
		font-size: 28px;
	}
</style>
