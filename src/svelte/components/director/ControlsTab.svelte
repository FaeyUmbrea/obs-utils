<svelte:options runes={true} />
<script lang='ts'>
	import { generateDataBlockFromSetting, settings } from '../../../utils/settings.ts';
	import { sendOpenSettingsConfig } from '../../../utils/socket.ts';
	import LevelsSection from './LevelsSection.svelte';

	const { disabled = false } = $props<{ disabled?: boolean }>();

	const { ic, ooc, players } = generateDataBlockFromSetting();
	const currentIC = settings.getStore('defaultInCombat');
	const currentOOC = settings.getStore('defaultOutOfCombat');
	const currentTrackedPlayer = settings.getStore('trackedUser');
	const clampCanvas = settings.getStore('clampCanvas');
	const pauseCameraTracking = settings.getStore('pauseCameraTracking');
	const cameraSmoothing = settings.getStore('cameraSmoothing');
	const cameraEasing = settings.getStore('cameraEasing');
	const cameraTrackingMode = settings.getStore('cameraTrackingMode');

	const easingOptions = [
		{ value: 'direct', labelKey: 'obs-utils.applications.director.easingDirect', icon: 'fas fa-bolt' },
		{ value: 'linear', labelKey: 'obs-utils.applications.director.easingLinear', icon: 'fas fa-minus' },
		{ value: 'easeOutCircle', labelKey: 'obs-utils.applications.director.easingEaseOut', icon: 'fas fa-arrow-right-long' },
		{ value: 'easeInOutCircle', labelKey: 'obs-utils.applications.director.easingEaseInOut', icon: 'fas fa-film' },
		{ value: 'easeOutCosine', labelKey: 'obs-utils.applications.director.easingEaseOutCosine', icon: 'fas fa-wave-square' },
		{ value: 'easeInOutCosine', labelKey: 'obs-utils.applications.director.easingEaseInOutCosine', icon: 'fas fa-water' },
	];

	const trackingModeOptions = [
		{ value: 'raw', labelKey: 'obs-utils.applications.director.trackingModeRaw', tipKey: 'obs-utils.applications.director.trackingModeRawTip', icon: 'fas fa-bolt' },
		{ value: 'smooth', labelKey: 'obs-utils.applications.director.trackingModeSmooth', tipKey: 'obs-utils.applications.director.trackingModeSmoothTip', icon: 'fas fa-wave-square' },
		{ value: 'dragRelease', labelKey: 'obs-utils.applications.director.trackingModeDragRelease', tipKey: 'obs-utils.applications.director.trackingModeDragReleaseTip', icon: 'fas fa-hand' },
	];
</script>

<div class='controls-grid'>
	<div class='col col-left'>
		<div class='mode-row'>
			<b>{game.i18n?.localize('obs-utils.applications.director.icTypeHeader')}</b>
			<div class='radio-row'>
				{#each ic as { id, tooltip, icon } (id)}
					<input
						type='radio'
						bind:group={$currentIC}
						id='radioic{id}'
						name='currentIC'
						value={id}
						{disabled}
					/>
					<label class='button' class:disabled for='radioic{id}' title={game.i18n?.localize(tooltip)}>
						<i class={icon}></i>
					</label>
				{/each}
			</div>
		</div>
		<div class='mode-row'>
			<b>{game.i18n?.localize('obs-utils.applications.director.oocTypeHeader')}</b>
			<div class='radio-row'>
				{#each ooc as { id, tooltip, icon } (id)}
					<input
						type='radio'
						bind:group={$currentOOC}
						id='radioooc{id}'
						name='currentOOC'
						value={id}
						{disabled}
					/>
					<label class='button' class:disabled for='radioooc{id}' title={game.i18n?.localize(tooltip)}>
						<i class={icon}></i>
					</label>
				{/each}
			</div>
		</div>
		<div class='camera-section'>
			<b>{game.i18n?.localize('obs-utils.applications.director.cameraSmoothingHeader')}</b>
			<div class='tracking-mode-row'>
				<span class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.trackingModeHeader')}</span>
				<div class='radio-row'>
					{#each trackingModeOptions as opt (opt.value)}
						<input
							type='radio'
							bind:group={$cameraTrackingMode}
							id='trackmode{opt.value}'
							name='cameraTrackingMode'
							value={opt.value}
							{disabled}
						/>
						<label
							class='button'
							class:disabled
							for='trackmode{opt.value}'
							title={`${game.i18n?.localize(opt.labelKey)} — ${game.i18n?.localize(opt.tipKey)}`}
						>
							<i class={opt.icon}></i>
						</label>
					{/each}
				</div>
			</div>
			<div class='easing-row'>
				<span class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.easing')}</span>
				<div class='radio-row'>
					{#each easingOptions as opt (opt.value)}
						<input
							type='radio'
							bind:group={$cameraEasing}
							id='easing{opt.value}'
							name='cameraEasing'
							value={opt.value}
							{disabled}
						/>
						<label
							class='button'
							class:disabled
							for='easing{opt.value}'
							title={game.i18n?.localize(opt.labelKey)}
						>
							<i class={opt.icon}></i>
						</label>
					{/each}
				</div>
			</div>
			<div class='smoothing-row' class:disabled-row={$cameraEasing === 'direct'}>
				<label for='cameraSmoothing' class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.duration')}</label>
				<input
					id='cameraSmoothing'
					type='range'
					min='0'
					max='1500'
					step='50'
					bind:value={$cameraSmoothing}
					disabled={disabled || $cameraEasing === 'direct'}
				/>
				<span class='value-readout'>{$cameraSmoothing}ms</span>
			</div>
		</div>
	</div>
	<div class='col col-right'>
		<div class='mode-row'>
			<b>{game.i18n?.localize('obs-utils.applications.director.trackedPlayerHeader')}</b>
			<select
				bind:value={$currentTrackedPlayer}
				name='trackedPlayer'
				id='trackedPlayer'
				{disabled}
			>
				{#each players as { id, name } (id)}
					<option value={id}>{name}</option>
				{/each}
			</select>
		</div>
		<div class='mode-row'>
			<div class='controls-row'>
				<input name='limitCanvas' id='limitCanvas' type='checkbox' bind:checked={$clampCanvas} {disabled} />
				<label
					class='button'
					class:disabled
					title={game.i18n?.localize('obs-utils.strings.limitCanvas')}
					for='limitCanvas'><i class='fas fa-arrows-maximize'></i></label
				>
				<input name='pauseCameraTracking' id='pauseCameraTracking' type='checkbox' bind:checked={$pauseCameraTracking} {disabled} />
				<label
					class='button'
					class:disabled
					title={game.i18n?.localize('obs-utils.strings.pauseCameraTracking')}
					for='pauseCameraTracking'><i class='fas fa-pause'></i></label
				>
				<input name='forceOpenSettingsForOBSUser' id='forceOpenSettingsForOBSUser' type='button' onclick={() => sendOpenSettingsConfig()} {disabled} />
				<label
					class='button'
					class:disabled
					title={game.i18n?.localize('obs-utils.applications.director.forceOpenSettingsForOBSUser')}
					for='forceOpenSettingsForOBSUser'><i class='fas fa-cog'></i></label
				>
			</div>
		</div>
		<!-- Renders nothing unless the active scene actually has floors, so v13
			and single-level v14 scenes are unaffected. -->
		<LevelsSection {disabled} />
	</div>
</div>

<style lang='stylus'>
	.controls-grid
		display grid
		grid-template-columns 3fr 2fr
		gap 12px
		// The Director is a fixed 370px tall and shared by every tab, so the
		// columns absorb overflow themselves rather than growing the window.
		min-height 0
		max-height 100%

		.col
			display flex
			flex-direction column
			gap 10px
			min-width 0
			min-height 0
			overflow-y auto

	// Radios/checkboxes/button-inputs are hidden — their <label> renders the
	// visual button. Other input types stay visible so they don't ghost at (0,0).
	input[type=radio],
	input[type=checkbox],
	input[type=button]
		opacity 0
		position fixed
		width 0
		pointer-events none

	label.button
		box-sizing border-box
		width 40px
		height 40px
		display inline-flex
		border 2px solid #444
		justify-content center
		align-items center
		border-radius 4px
		flex 0 0 40px

		i
			display flex
			justify-content center
			align-items center
			font-size 18px

		&:hover
			background-color #dfd

		&.disabled
			opacity 0.5
			cursor not-allowed
			pointer-events none

			&:hover
				background-color transparent

	input:checked + label
		border-color #4c4

	.mode-row
		display flex
		flex-direction column
		gap 6px

		b
			font-size 11px
			text-transform uppercase
			letter-spacing 0.5px
			opacity 0.75

		.radio-row
			display flex
			gap 6px
			justify-content flex-start

		select
			opacity 1
			position relative
			width 100%
			height 26px

	.camera-section
		display flex
		flex-direction column
		gap 6px

		b
			font-size 11px
			text-transform uppercase
			letter-spacing 0.5px
			opacity 0.75

		.smoothing-row
			display grid
			grid-template-columns 70px 1fr 56px
			align-items center
			gap 8px

			.inline-label
				font-size 12px
				opacity 0.8

			input[type=range]
				opacity 1
				position relative
				width 100%
				height 26px

			input[type=range]
				padding 0

			.value-readout
				font-family monospace
				font-size 11px
				opacity 0.7
				text-align right

			&.disabled-row
				opacity 0.4

		// Tracking-mode + easing share a compact 70-px-label grid, with
		// half-height (20px) icon-only radios so they don't compete with the
		// 40px IC/OOC mode picker above.
		.tracking-mode-row,
		.easing-row
			display grid
			grid-template-columns 70px 1fr
			align-items center
			gap 8px

			.inline-label
				font-size 12px
				opacity 0.8

			.radio-row label.button
				width 32px
				height 20px
				border-width 1px
				flex 0 0 32px

				i
					font-size 12px

			.radio-row
				display flex
				gap 6px
				justify-content flex-start

	.controls-row
		display flex
		gap 6px
</style>
