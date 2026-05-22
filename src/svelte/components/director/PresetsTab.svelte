<svelte:options runes={true} />
<script lang='ts'>
	import type { CameraPreset } from '../../../utils/cameraPresets.ts';
	import { onDestroy, onMount } from 'svelte';
	import { makePreset, readPresets, writePresets } from '../../../utils/cameraPresets.ts';
	import { getLocalViewport } from '../../../utils/canvas.ts';
	import { getApi } from '../../../utils/helpers.ts';
	import { broadcastStopPreset } from '../../../utils/socket.ts';

	let currentScene = $state<any>((canvas as any)?.scene ?? null);
	// initializer captures currentScene once — refreshFromCurrentScene keeps them in sync
	let presets = $state<CameraPreset[]>(readPresets((canvas as any)?.scene ?? null));

	// Id of the preset whose keyframe editor is currently open. Only one at a time.
	let expandedId = $state<string | null>(null);

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

	async function addStaticPreset() {
		if (!currentScene) return;
		const vp = getLocalViewport();
		if (!vp) return;
		const next = [...presets, makePreset(vp, presets.length)];
		presets = next;
		await writePresets(currentScene, next);
	}

	async function addAnimationPreset() {
		if (!currentScene) return;
		const vp = getLocalViewport();
		if (!vp) return;
		const preset = makePreset(vp, presets.length);
		// Seed with a single keyframe at t=0 so the row is recognized as animated
		// and clicking the edit button drops straight into the keyframe editor.
		preset.keyframes = [{ time: 0, x: Math.round(vp.x), y: Math.round(vp.y), scale: vp.scale, easing: 'easeInOut' }];
		preset.name = `${preset.name} (animation)`;
		const next = [...presets, preset];
		presets = next;
		await writePresets(currentScene, next);
		// Auto-open the editor for the new animation preset.
		expandedId = preset.id;
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
		if (expandedId === id) expandedId = null;
		presets = presets.filter(p => p.id !== id);
		await writePresets(currentScene, presets);
	}

	async function openAnimationWindow(id: string) {
		if (!currentScene) {
			console.warn('[obs-utils] openAnimationWindow: no current scene');
			return;
		}
		try {
			const mod = await import('../../../applications/animationpreset.ts');
			const App = mod.default;
			const app = new App({}, { presetId: id, sceneId: currentScene.id });
			await app.render(true);
		} catch (err) {
			console.error('[obs-utils] Failed to open animation preset window:', err);
		}
	}

	function editPreset(p: CameraPreset) {
		const isAnimation = (p.keyframes?.length ?? 0) > 0;
		if (isAnimation) {
			openAnimationWindow(p.id);
		} else {
			// Static preset has no inline editor body — clicking edit just selects
			// the row visually. Future: small inline form for pan-in config.
			expandedId = expandedId === p.id ? null : p.id;
		}
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
	<div class='preset-add-group'>
		<button
			type='button'
			class='preset-add-btn'
			onclick={addStaticPreset}
			disabled={!currentScene}
			title={game.i18n?.localize('obs-utils.applications.director.presetAddStatic')}
		>
			<i class='fas fa-camera'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.presetAddStatic')}</span>
		</button>
		<button
			type='button'
			class='preset-add-btn'
			onclick={addAnimationPreset}
			disabled={!currentScene}
			title={game.i18n?.localize('obs-utils.applications.director.presetAddAnimation')}
		>
			<i class='fas fa-film'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.presetAddAnimation')}</span>
		</button>
		<button
			type='button'
			class='preset-add-btn danger'
			onclick={broadcastStopPreset}
			title={game.i18n?.localize('obs-utils.applications.director.presetStopAll') ?? 'Stop active preset'}
			aria-label={game.i18n?.localize('obs-utils.applications.director.presetStopAll') ?? 'Stop active preset'}
		>
			<i class='fas fa-stop'></i>
		</button>
	</div>
</div>
{#if presets.length > 0}
	<ul class='preset-list'>
		{#each presets as p (p.id)}
			{@const isAnimation = (p.keyframes?.length ?? 0) > 0}
			<li class='preset-item'>
				<div class='preset' class:preset--expanded={expandedId === p.id}>
					{#if isAnimation}
						<i class='fas fa-film preset-kind animated' title={game.i18n?.localize('obs-utils.applications.director.presetKindAnimation')}></i>
					{:else}
						<i class='fas fa-camera preset-kind static' title={game.i18n?.localize('obs-utils.applications.director.presetKindStatic')}></i>
					{/if}
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
						title={isAnimation
							? game.i18n?.localize('obs-utils.applications.director.presetPlay')
							: game.i18n?.localize('obs-utils.applications.director.presetPanTo')}
						aria-label={isAnimation
							? game.i18n?.localize('obs-utils.applications.director.presetPlay')
							: game.i18n?.localize('obs-utils.applications.director.presetPanTo')}
					>
						{#if isAnimation}
							<i class='fas fa-play'></i>
						{:else}
							<i class='fas fa-arrow-right'></i>
						{/if}
					</button>
					{#if isAnimation}
						<button
							type='button'
							class='preset-action'
							onclick={() => editPreset(p)}
							title={game.i18n?.localize('obs-utils.applications.director.keyframeEditor.expandLabel')}
							aria-label={game.i18n?.localize('obs-utils.applications.director.keyframeEditor.expandLabel')}
						>
							<i class='fas fa-pen-to-square'></i>
						</button>
					{:else}
						<button
							type='button'
							class='preset-action'
							onclick={() => updatePresetToCurrent(p.id)}
							title={game.i18n?.localize('obs-utils.applications.director.presetUpdate')}
							aria-label={game.i18n?.localize('obs-utils.applications.director.presetUpdate')}
						><i class='fas fa-arrow-down-to-bracket'></i></button>
					{/if}
					<button
						type='button'
						class='preset-action danger'
						onclick={() => deletePreset(p.id)}
						title={game.i18n?.localize('obs-utils.applications.director.presetDelete')}
						aria-label={game.i18n?.localize('obs-utils.applications.director.presetDelete')}
					><i class='fas fa-trash'></i></button>
				</div>
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

		.preset-add-group
			display inline-flex
			gap 4px

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

			&.danger
				background rgba(220, 60, 60, 0.18)
				border-color rgba(220, 60, 60, 0.45)

				&:hover:not(:disabled)
					background rgba(220, 60, 60, 0.28)
					border-color rgba(220, 60, 60, 0.7)

	:global(.preset-kind)
		font-size 11px
		opacity 0.7
		margin-right 4px

		&.animated
			color #ffce80
			opacity 1

	.preset-list
		list-style none
		margin 0
		padding 0
		display flex
		flex-direction column
		gap 4px

	.preset-item
		display flex
		flex-direction column

	.preset
		display flex
		align-items center
		gap 4px
		padding 4px 6px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.07)
		border-radius 4px

		&--expanded
			border-bottom-left-radius 0
			border-bottom-right-radius 0
			border-bottom-color rgba(255, 144, 0, 0.2)

		.preset-name
			flex 1 1 auto
			min-width 0
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
			flex 0 0 26px
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
