<svelte:options runes={true} />
<script lang='ts'>
	import { settings as rollOverlaySettings } from '../../../utils/settings.ts';
	import PlayerRollComponent from '../../streamoverlays/overlaycomponents/PlayerRollComponent.svelte';

	const preRollDelay = rollOverlaySettings.getStore('rollOverlayPreRollDelay');
	const preRollStay = rollOverlaySettings.getStore('rollOverlayPreRollStay');
	const preRollFadeIn = rollOverlaySettings.getStore('rollOverlayPreRollFadeIn');
	const preRollFadeOut = rollOverlaySettings.getStore(
		'rollOverlayPreRollFadeOut',
	);
	const rollStay = rollOverlaySettings.getStore('rollOverlayRollStay');
	const rollFadeIn = rollOverlaySettings.getStore('rollOverlayRollFadeIn');
	const rollFadeOut = rollOverlaySettings.getStore('rollOverlayRollFadeOut');
	const postRollStay = rollOverlaySettings.getStore('rollOverlayPostRollStay');
	const postRollFadeIn = rollOverlaySettings.getStore(
		'rollOverlayPostRollFadeIn',
	);
	const postRollFadeOut = rollOverlaySettings.getStore(
		'rollOverlayPostRollFadeOut',
	);

	const preRollImage = rollOverlaySettings.getStore('rollOverlayPreRollImage');
	const rollBackgroundImage = rollOverlaySettings.getStore(
		'rollOverlayRollBackground',
	);
	const rollForegroundImage = rollOverlaySettings.getStore(
		'rollOverlayRollForeground',
	);
	const postRollImage = rollOverlaySettings.getStore('rollOverlayPostRollImage');

	const pre = rollOverlaySettings.getStore('rollOverlayPostRollEnabled');
	const post = rollOverlaySettings.getStore('rollOverlayPreRollEnabled');

	let rollValue = $state('');

	function test() {
		rollValue = Math.round(Math.random() * 20).toString();
	}

	let filePickerAppPreRoll: foundry.applications.apps.FilePicker | undefined;

	async function openFilePickerPreRoll() {
		if (filePickerAppPreRoll && filePickerAppPreRoll.state !== foundry.applications.api.ApplicationV2.RENDER_STATES.CLOSED) {
			filePickerAppPreRoll.bringToFront();
		} else {
			filePickerAppPreRoll = new foundry.applications.apps.FilePicker({
				type: 'image',
				callback: (path) => {
					$preRollImage = path;
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
					$rollForegroundImage = path;
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
					$rollBackgroundImage = path;
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
					$postRollImage = path;
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

<div class='editor'>
	<section class='preview obs-utils roll-overlay'>
		<PlayerRollComponent
			bind:rollValue={rollValue}
			id='preview'
		/>
		<button onclick={test}
		>{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.test')}</button
		>
	</section>
	<section class='menu'>
		<div class='pre'>
			<section class='header'>
				<input bind:checked={$pre} type='checkbox' />

				<span
				>{game.i18n?.localize(
					'obs-utils.applications.rollOverlayEditor.preRollImage',
				)}</span
				>
			</section>
			<section class='content'>
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.imageUrl')}
				<section class='filepicker'>
					<input bind:value={$preRollImage} type='text' />
					<button aria-label='Open Filepicker' onclick={openFilePickerPreRoll}
					><i class='fa-solid fa-file'></i></button
					>
				</section>
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.delay')}
				<input bind:value={$preRollDelay} min='0' type='number' />
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeIn')}
				<input bind:value={$preRollFadeIn} min='0' type='number' />
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.duration')}
				<input bind:value={$preRollStay} min='0' type='number' />
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeOut')}
				<input bind:value={$preRollFadeOut} min='0' type='number' />
			</section>
		</div>
		<div class='roll'>
			<section class='header'>
				<span
				>&nbsp;{game.i18n?.localize(
					'obs-utils.applications.rollOverlayEditor.rollImage',
				)}</span
				>
			</section>
			<section class='content'>
				{game.i18n?.localize(
					'obs-utils.applications.rollOverlayEditor.foregroundImageUrl',
				)}
				<section class='filepicker'>
					<input bind:value={$rollForegroundImage} type='text' />
					<button aria-label='Open Filepicker' onclick={openFilePickerForeground}
					><i class='fa-solid fa-file'></i></button
					>
				</section>
				{game.i18n?.localize(
					'obs-utils.applications.rollOverlayEditor.backgroundImageUrl',
				)}
				<section class='filepicker'>
					<input bind:value={$rollBackgroundImage} type='text' />
					<button aria-label='Open Filepicker' onclick={openFilePickerBackground}
					><i class='fa-solid fa-file'></i></button
					>
				</section>
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeIn')}
				<input bind:value={$rollFadeIn} min='0' type='number' />
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.duration')}
				<input bind:value={$rollStay} min='0' type='number' />
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeOut')}
				<input bind:value={$rollFadeOut} min='0' type='number' />
			</section>
		</div>
		<div class='post'>
			<section class='header'>
				<input bind:checked={$post} type='checkbox' />
				<span>
					{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.postRollImage')}
				</span>
			</section>
			<section class='content'>
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.imageUrl')}
				<section class='filepicker'>
					<input bind:value={$postRollImage} type='text' />
					<button aria-label='Open Filepicker' onclick={openFilePickerPostRoll}
					><i class='fa-solid fa-file'></i></button
					>
				</section>
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeIn')}
				<input bind:value={$postRollFadeIn} min='0' type='number' />
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.duration')}
				<input bind:value={$postRollStay} min='0' type='number' />
				{game.i18n?.localize('obs-utils.applications.rollOverlayEditor.fadeOut')}
				<input bind:value={$postRollFadeOut} min='0' type='number' />
			</section>
		</div>
	</section>
</div>

<style lang='stylus'>
  .editor
    display grid
    grid-template-rows auto auto
    height 100%

    .preview
      grid-row-start 1
      background black
      border-radius 5px
      color white
      margin unset
      padding unset
      position relative

      button
        position absolute
        bottom 1px
        left 0
        width 40px
        background black
        color white
        border-color darkgray

    .menu
      grid-row-start 2
      display grid
      grid-template-columns 1fr 1fr 1fr

      // Text Inputs with 35px wide button on the right side

      .filepicker
        display flex

        button
          width 35px

      div
        border-left 2px solid grey
        border-right 2px solid grey
        border-bottom 2px solid grey
        border-radius 6px
        margin 2px

        .header
          display flex
          height 30px
          align-items center
          border-bottom 1px solid gray
          border-top 2px solid gray
          border-top-left-radius 6px
          border-top-right-radius 6px

        .content
          margin 2px

      .pre
        grid-column-start 1

      .roll
        grid-column-start 2

      .post
        grid-column-start 3
</style>
