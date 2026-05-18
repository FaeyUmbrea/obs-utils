<svelte:options runes={true} />
<script lang='ts'>
	import { OverlayData } from '../../../utils/types.ts';

	let { overlay = $bindable<OverlayData>(), refreshFn = $bindable<() => void>() } = $props();

	let preEnabled = $state((overlay.config?.preRollEnabled ?? false) as boolean);
	let postEnabled = $state((overlay.config?.postRollEnabled ?? false) as boolean);
	let preRollDelay = $state((overlay.config?.preRollDelay ?? 0) as number);
	let preRollFadeIn = $state((overlay.config?.preRollFadeIn ?? 0) as number);
	let preRollFadeOut = $state((overlay.config?.preRollFadeOut ?? 0) as number);
	let preRollStay = $state((overlay.config?.preRollStay ?? 0) as number);
	let preRollImage = $state((overlay.config?.preRollImage ?? '') as string);
	let rollFadeIn = $state((overlay.config?.rollFadeIn ?? 0) as number);
	let rollFadeOut = $state((overlay.config?.rollFadeOut ?? 0) as number);
	let rollStay = $state((overlay.config?.rollStay ?? 5000) as number);
	let rollBackground = $state((overlay.config?.rollBackground ?? '') as string);
	let rollForeground = $state((overlay.config?.rollForeground ?? '') as string);
	let postRollFadeIn = $state((overlay.config?.postRollFadeIn ?? 0) as number);
	let postRollFadeOut = $state((overlay.config?.postRollFadeOut ?? 0) as number);
	let postRollStay = $state((overlay.config?.postRollStay ?? 0) as number);
	let postRollImage = $state((overlay.config?.postRollImage ?? '') as string);

	$effect(() => {
		overlay.config = { ...overlay.config, preRollEnabled: preEnabled };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, postRollEnabled: postEnabled };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, preRollDelay };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, preRollFadeIn };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, preRollFadeOut };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, preRollStay };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, preRollImage };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, rollFadeIn };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, rollFadeOut };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, rollStay };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, rollBackground };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, rollForeground };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, postRollFadeIn };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, postRollFadeOut };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, postRollStay };
	});
	$effect(() => {
		overlay.config = { ...overlay.config, postRollImage };
	});

	let filePickerAppPreRoll: foundry.applications.apps.FilePicker | undefined;

	async function openFilePickerPreRoll() {
		if (filePickerAppPreRoll && filePickerAppPreRoll.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			filePickerAppPreRoll.bringToFront();
		} else {
			filePickerAppPreRoll = new foundry.applications.apps.FilePicker({
				type: 'image',
				callback: (path) => {
					preRollImage = path;
					filePickerAppPreRoll = undefined;
				},
				window: {
					title: 'Select an Image',
				},
			});
			await filePickerAppPreRoll.render();
		}
	}

	let filePickerAppForeground: foundry.applications.apps.FilePicker | undefined;

	async function openFilePickerForeground() {
		if (filePickerAppForeground && filePickerAppForeground.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			filePickerAppForeground.bringToFront();
		} else {
			filePickerAppForeground = new foundry.applications.apps.FilePicker({
				type: 'image',
				callback: (path) => {
					rollForeground = path;
					filePickerAppForeground = undefined;
				},
				window: {
					title: 'Select an Image',
				},
			});
			await filePickerAppForeground.render();
		}
	}

	let filePickerAppBackground: foundry.applications.apps.FilePicker | undefined;

	async function openFilePickerBackground() {
		if (filePickerAppBackground && filePickerAppBackground.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			filePickerAppBackground.bringToFront();
		} else {
			filePickerAppBackground = new foundry.applications.apps.FilePicker({
				type: 'image',
				callback: (path) => {
					rollBackground = path;
					filePickerAppBackground = undefined;
				},
				window: {
					title: 'Select an Image',
				},
			});
			await filePickerAppBackground.render();
		}
	}

	let filePickerAppPostRoll: foundry.applications.apps.FilePicker | undefined;

	async function openFilePickerPostRoll() {
		if (filePickerAppPostRoll && filePickerAppPostRoll.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			filePickerAppPostRoll.bringToFront();
		} else {
			filePickerAppPostRoll = new foundry.applications.apps.FilePicker({
				type: 'image',
				callback: (path) => {
					postRollImage = path;
					filePickerAppPostRoll = undefined;
				},
				window: {
					title: 'Select an Image',
				},
			});
			await filePickerAppPostRoll.render();
		}
	}
</script>

<div class='roll-editor'>
	<section class='stage' class:disabled={!preEnabled}>
		<header class='stage-header'>
			<input bind:checked={preEnabled} type='checkbox' aria-label='Pre-Roll enabled' />
			<span class='stage-title'>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.preRollImage')}</span>
		</header>
		<div class='stage-body'>
			<label class='field'>
				<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.imageUrl')}</span>
				<div class='filepicker'>
					<input bind:value={preRollImage} type='text' />
					<button type='button' aria-label='Open Filepicker' onclick={openFilePickerPreRoll}>
						<i class='fa-solid fa-folder-open'></i>
					</button>
				</div>
			</label>
			<div class='row two-col'>
				<label class='field'>
					<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.delay')}</span>
					<input bind:value={preRollDelay} min='0' type='number' />
				</label>
				<label class='field'>
					<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeIn')}</span>
					<input bind:value={preRollFadeIn} min='0' type='number' />
				</label>
			</div>
			<div class='row two-col'>
				<label class='field'>
					<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.duration')}</span>
					<input bind:value={preRollStay} min='0' type='number' />
				</label>
				<label class='field'>
					<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeOut')}</span>
					<input bind:value={preRollFadeOut} min='0' type='number' />
				</label>
			</div>
		</div>
	</section>

	<section class='stage'>
		<header class='stage-header'>
			<i class='fas fa-dice-d20'></i>
			<span class='stage-title'>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.rollImage')}</span>
		</header>
		<div class='stage-body'>
			<label class='field'>
				<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.foregroundImageUrl')}</span>
				<div class='filepicker'>
					<input bind:value={rollForeground} type='text' />
					<button type='button' aria-label='Open Filepicker' onclick={openFilePickerForeground}>
						<i class='fa-solid fa-folder-open'></i>
					</button>
				</div>
			</label>
			<label class='field'>
				<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.backgroundImageUrl')}</span>
				<div class='filepicker'>
					<input bind:value={rollBackground} type='text' />
					<button type='button' aria-label='Open Filepicker' onclick={openFilePickerBackground}>
						<i class='fa-solid fa-folder-open'></i>
					</button>
				</div>
			</label>
			<div class='row two-col'>
				<label class='field'>
					<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeIn')}</span>
					<input bind:value={rollFadeIn} min='0' type='number' />
				</label>
				<label class='field'>
					<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeOut')}</span>
					<input bind:value={rollFadeOut} min='0' type='number' />
				</label>
			</div>
			<label class='field'>
				<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.duration')}</span>
				<input bind:value={rollStay} min='0' type='number' />
			</label>
		</div>
	</section>

	<section class='stage' class:disabled={!postEnabled}>
		<header class='stage-header'>
			<input bind:checked={postEnabled} type='checkbox' aria-label='Post-Roll enabled' />
			<span class='stage-title'>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.postRollImage')}</span>
		</header>
		<div class='stage-body'>
			<label class='field'>
				<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.imageUrl')}</span>
				<div class='filepicker'>
					<input bind:value={postRollImage} type='text' />
					<button type='button' aria-label='Open Filepicker' onclick={openFilePickerPostRoll}>
						<i class='fa-solid fa-folder-open'></i>
					</button>
				</div>
			</label>
			<div class='row two-col'>
				<label class='field'>
					<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeIn')}</span>
					<input bind:value={postRollFadeIn} min='0' type='number' />
				</label>
				<label class='field'>
					<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeOut')}</span>
					<input bind:value={postRollFadeOut} min='0' type='number' />
				</label>
			</div>
			<label class='field'>
				<span>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.duration')}</span>
				<input bind:value={postRollStay} min='0' type='number' />
			</label>
		</div>
	</section>
</div>

<style lang='stylus'>
	.roll-editor
		display flex
		flex-direction column
		flex 1 1 auto
		min-height 0
		height 100%
		overflow-y auto
		gap 8px
		padding 4px 0

	.stage
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 4px
		background rgba(0, 0, 0, 0.1)

		&.disabled .stage-body
			opacity 0.4
			pointer-events none

	.stage-header
		display flex
		align-items center
		gap 6px
		padding 6px 8px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)
		background rgba(255, 144, 0, 0.06)

		.stage-title
			font-size 11px
			font-weight 600
			text-transform uppercase
			letter-spacing 0.5px

		input[type=checkbox]
			width 14px
			height 14px

	.stage-body
		padding 6px 8px
		display flex
		flex-direction column
		gap 4px

	.row
		display flex
		gap 6px

		&.two-col
			display grid
			grid-template-columns 1fr 1fr

	.field
		display flex
		flex-direction column
		gap 2px

		span
			font-size 10px
			opacity 0.7

		input
			width 100%
			height 24px
			padding 0 6px
			font-size 12px

	.filepicker
		display flex
		gap 4px

		input
			flex 1 1 auto
			min-width 0
			height 24px
			padding 0 6px
			font-size 12px

		button
			width 28px
			height 24px
			padding 0
			display flex
			align-items center
			justify-content center
</style>
