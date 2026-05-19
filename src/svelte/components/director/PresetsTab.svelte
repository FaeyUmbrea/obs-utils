<svelte:options runes={true} />
<script lang='ts'>
	import type { CameraPreset } from '../../../utils/cameraPresets.ts';
	import { onDestroy, onMount } from 'svelte';
	import { makePreset, readPresets, writePresets } from '../../../utils/cameraPresets.ts';
	import { getLocalViewport } from '../../../utils/canvas.ts';
	import { getApi } from '../../../utils/helpers.ts';

	let currentScene = $state<any>((canvas as any)?.scene ?? null);
	// initializer captures currentScene once — refreshFromCurrentScene keeps them in sync
	let presets = $state<CameraPreset[]>(readPresets((canvas as any)?.scene ?? null));

	function refreshFromCurrentScene() {
		currentScene = (canvas as any)?.scene ?? null;
		presets = readPresets(currentScene);
	}
	function onCanvasReady() {
		refreshFromCurrentScene();
	}
	function onUpdateScene(scene: any) {
		if (scene?.id && currentScene?.id === scene.id) {
			presets = readPresets(scene);
		}
	}
	onMount(() => {
		Hooks.on('canvasReady', onCanvasReady);
		Hooks.on('updateScene', onUpdateScene);
	});
	onDestroy(() => {
		Hooks.off('canvasReady', onCanvasReady);
		Hooks.off('updateScene', onUpdateScene);
	});

	async function addPreset() {
		if (!currentScene) return;
		const vp = getLocalViewport();
		if (!vp) return;
		const next = [...presets, makePreset(vp, presets.length)];
		presets = next;
		await writePresets(currentScene, next);
	}
	function applyPreset(p: CameraPreset) {
		getApi().playPreset(p);
	}
	async function updatePresetToCurrent(id: string) {
		if (!currentScene) return;
		const vp = getLocalViewport();
		if (!vp) return;
		presets = presets.map(p =>
			p.id === id ? { ...p, x: Math.round(vp.x), y: Math.round(vp.y), scale: vp.scale } : p,
		);
		await writePresets(currentScene, presets);
	}
	async function renamePreset(id: string, name: string) {
		if (!currentScene) return;
		presets = presets.map(p => (p.id === id ? { ...p, name } : p));
		await writePresets(currentScene, presets);
	}
	async function deletePreset(id: string) {
		if (!currentScene) return;
		presets = presets.filter(p => p.id !== id);
		await writePresets(currentScene, presets);
	}
</script>

<div class='presets-header'>
	<div class='scene-label'>
		<i class='fas fa-map'></i>
		{#if currentScene}
			<span>{currentScene.name}</span>
		{:else}
			<span class='no-scene'>{game.i18n?.localize('obs-utils.applications.director.presetsNoScene')}</span>
		{/if}
	</div>
	<button
		type='button'
		class='preset-add-btn'
		onclick={addPreset}
		disabled={!currentScene}
		title={game.i18n?.localize('obs-utils.applications.director.presetAdd')}
	>
		<i class='fas fa-plus'></i>
		<span>{game.i18n?.localize('obs-utils.applications.director.presetAdd')}</span>
	</button>
</div>
{#if presets.length > 0}
	<ul class='preset-list'>
		{#each presets as p (p.id)}
			<li class='preset'>
				<input
					type='text'
					class='preset-name'
					value={p.name}
					onchange={e => renamePreset(p.id, (e.currentTarget as HTMLInputElement).value)}
				/>
				<button
					type='button'
					class='preset-action'
					onclick={() => applyPreset(p)}
					title={game.i18n?.localize('obs-utils.applications.director.presetApply')}
					aria-label={game.i18n?.localize('obs-utils.applications.director.presetApply')}
				><i class='fas fa-eye'></i></button>
				<button
					type='button'
					class='preset-action'
					onclick={() => updatePresetToCurrent(p.id)}
					title={game.i18n?.localize('obs-utils.applications.director.presetUpdate')}
					aria-label={game.i18n?.localize('obs-utils.applications.director.presetUpdate')}
				><i class='fas fa-arrows-rotate'></i></button>
				<button
					type='button'
					class='preset-action danger'
					onclick={() => deletePreset(p.id)}
					title={game.i18n?.localize('obs-utils.applications.director.presetDelete')}
					aria-label={game.i18n?.localize('obs-utils.applications.director.presetDelete')}
				><i class='fas fa-trash'></i></button>
			</li>
		{/each}
	</ul>
{:else}
	<div class='empty-presets'>
		<i class='fas fa-bookmark'></i>
		<p>{game.i18n?.localize('obs-utils.applications.director.presetsEmpty')}</p>
	</div>
{/if}

<style lang='stylus'>
	.presets-header
		display flex
		align-items center
		justify-content space-between
		gap 8px
		margin-bottom 8px

		.scene-label
			display flex
			align-items center
			gap 6px
			font-size 12px

			i
				opacity 0.6
				font-size 11px

			.no-scene
				opacity 0.6
				font-style italic

		.preset-add-btn
			display inline-flex
			align-items center
			gap 6px
			height 26px
			padding 0 10px
			font-size 11px
			background rgba(255, 144, 0, 0.15)
			border 1px solid rgba(255, 144, 0, 0.4)
			border-radius 3px
			cursor pointer

			&:hover:not(:disabled)
				background rgba(255, 144, 0, 0.25)
				border-color rgba(255, 144, 0, 0.7)

			&:disabled
				opacity 0.4
				cursor not-allowed

	.preset-list
		list-style none
		margin 0
		padding 0
		display flex
		flex-direction column
		gap 4px

	.preset
		display grid
		grid-template-columns 1fr 26px 26px 26px
		gap 4px
		align-items center
		padding 4px 6px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.07)
		border-radius 4px

		.preset-name
			width 100%
			height 24px
			padding 0 6px
			font-size 12px
			background transparent
			border 1px solid transparent

			&:hover, &:focus
				background rgba(0, 0, 0, 0.25)
				border-color rgba(255, 255, 255, 0.1)
				outline none

		.preset-action
			width 26px
			height 24px
			padding 0
			display flex
			align-items center
			justify-content center
			background transparent
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			opacity 0.75
			font-size 11px

			&:hover
				opacity 1
				background rgba(255, 255, 255, 0.06)

			&.danger:hover
				background rgba(220, 60, 60, 0.15)
				border-color rgba(220, 60, 60, 0.4)

	.empty-presets
		display flex
		flex-direction column
		align-items center
		text-align center
		padding 20px
		gap 10px
		opacity 0.6

		i
			font-size 22px

		p
			margin 0
			font-size 12px
			line-height 1.4
			max-width 320px
</style>
