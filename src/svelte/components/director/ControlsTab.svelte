<svelte:options runes={true} />
<script lang='ts'>
	import { generateDataBlockFromSetting, settings } from '../../../utils/settings.ts';
	import { sendOpenSettingsConfig } from '../../../utils/socket.ts';

	let { disabled = false } = $props<{ disabled?: boolean }>();

	const { ic, ooc, players } = generateDataBlockFromSetting();
	const currentIC = settings.getStore('defaultInCombat');
	const currentOOC = settings.getStore('defaultOutOfCombat');
	const currentTrackedPlayer = settings.getStore('trackedUser');
	const clampCanvas = settings.getStore('clampCanvas');
	const pauseCameraTracking = settings.getStore('pauseCameraTracking');
	const cameraSmoothing = settings.getStore('cameraSmoothing');
	const cameraEasing = settings.getStore('cameraEasing');

	const easingOptions = [
		{ value: 'linear', labelKey: 'obs-utils.applications.director.easingLinear' },
		{ value: 'easeOutCircle', labelKey: 'obs-utils.applications.director.easingEaseOut' },
		{ value: 'easeInOutCircle', labelKey: 'obs-utils.applications.director.easingEaseInOut' },
		{ value: 'easeOutCosine', labelKey: 'obs-utils.applications.director.easingEaseOutCosine' },
		{ value: 'easeInOutCosine', labelKey: 'obs-utils.applications.director.easingEaseInOutCosine' },
	];
</script>

<div class='controls-grid'>
	<div class='col col-left'>
		<div class='mode-row'>
			<b>{game.i18n?.localize('obs-utils.applications.director.icTypeHeader')}</b>
			<div class='radio-row'>
				{#each ic as { id, tooltip, icon }}
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
				{#each ooc as { id, tooltip, icon }}
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
			<div class='smoothing-row'>
				<label for='cameraEasing' class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.easing')}</label>
				<select id='cameraEasing' bind:value={$cameraEasing} {disabled}>
					{#each easingOptions as opt}
						<option value={opt.value}>{game.i18n?.localize(opt.labelKey)}</option>
					{/each}
				</select>
			</div>
			<div class='smoothing-row'>
				<label for='cameraSmoothing' class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.duration')}</label>
				<input id='cameraSmoothing' type='range' min='0' max='1500' step='50' bind:value={$cameraSmoothing} {disabled} />
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
				{#each players as { id, name }}
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
	</div>
</div>

<style lang='stylus'>
	.controls-grid
		display grid
		grid-template-columns 3fr 2fr
		gap 12px

		.col
			display flex
			flex-direction column
			gap 10px
			min-width 0

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
		width 40px
		height 40px
		display inline-flex
		border 2px solid #444
		justify-content center
		align-items center
		border-radius 4px

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

			select, input[type=range]
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

		.controls-row
			display flex
			gap 6px
</style>
