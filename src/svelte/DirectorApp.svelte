<svelte:options runes={true} />
<script lang='ts'>
	import type { ReadyGame } from 'fvtt-types/configuration';
	import { getAllGMs, getGM } from '../utils/helpers.ts';
	import { generateDataBlockFromSetting, settings } from '../utils/settings.ts';
	import { requestGMHandover, sendOpenSettingsConfig } from '../utils/socket.ts';

	const { ic, ooc, players } = generateDataBlockFromSetting();
	const currentIC = settings.getStore('defaultInCombat');
	const currentOOC = settings.getStore('defaultOutOfCombat');
	const currentTrackedPlayer = settings.getStore('trackedUser');
	const clampCanvas = settings.getStore('clampCanvas');
	const pauseCameraTracking = settings.getStore('pauseCameraTracking');
	const cameraSmoothing = settings.getStore('cameraSmoothing');
	const cameraEasing = settings.getStore('cameraEasing');
	const activeGMUserId = settings.getStore('activeGMUserId');
	const isDisabled = getGM()?.active !== true;

	const allGMs = getAllGMs();
	const showCoDMs = allGMs.length > 1;
	const myUserId = (game as ReadyGame).user?.id ?? '';

	// Resolved "currently active GM" — honors the setting, falls back to first online GM.
	const activeGMId = $derived.by(() => {
		const wanted = $activeGMUserId;
		if (wanted) {
			const u = allGMs.find((g: any) => g.id === wanted);
			if (u && (u as any).active) return wanted;
		}
		return allGMs.find((g: any) => (g as any).active)?.id ?? '';
	});

	function takeControl(fromUserId: string) {
		requestGMHandover(fromUserId);
	}

	const easingOptions = [
		{ value: 'linear', labelKey: 'obs-utils.applications.director.easingLinear' },
		{ value: 'easeOutCircle', labelKey: 'obs-utils.applications.director.easingEaseOut' },
		{ value: 'easeInOutCircle', labelKey: 'obs-utils.applications.director.easingEaseInOut' },
		{ value: 'easeOutCosine', labelKey: 'obs-utils.applications.director.easingEaseOutCosine' },
		{ value: 'easeInOutCosine', labelKey: 'obs-utils.applications.director.easingEaseInOutCosine' },
	];

	type TabKey = 'controls' | 'codms';
	let activeTab = $state<TabKey>('controls');

	async function onChangeIC(event: Event) {
		$currentIC = (event.target as HTMLInputElement).value;
	}
	async function onChangeOOC(event: Event) {
		$currentOOC = (event.target as HTMLInputElement).value;
	}
	async function onChangePlayer(event: Event) {
		$currentTrackedPlayer = (event.target as HTMLSelectElement).value;
	}
</script>

<main>
	{#if isDisabled}
		<div class='warning'>
			<i class='fas fa-exclamation-triangle'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.noGMWarning')}</span>
		</div>
	{/if}

	<nav class='tab-bar' role='tablist'>
		<button
			type='button'
			role='tab'
			class:active={activeTab === 'controls'}
			aria-selected={activeTab === 'controls'}
			onclick={() => (activeTab = 'controls')}
		>
			<i class='fas fa-video'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.tabControls')}</span>
		</button>
		<button
			type='button'
			role='tab'
			class:active={activeTab === 'codms'}
			aria-selected={activeTab === 'codms'}
			onclick={() => (activeTab = 'codms')}
		>
			<i class='fas fa-users'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.tabCoDMs')}</span>
		</button>
	</nav>

	<section class='tab-body'>
		{#if activeTab === 'controls'}
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
									onchange={onChangeIC}
									disabled={isDisabled}
								/>
								<label class='button' class:disabled={isDisabled} for='radioic{id}' title={game.i18n?.localize(tooltip)}>
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
									onchange={onChangeOOC}
									disabled={isDisabled}
								/>
								<label class='button' class:disabled={isDisabled} for='radioooc{id}' title={game.i18n?.localize(tooltip)}>
									<i class={icon}></i>
								</label>
							{/each}
						</div>
					</div>
					<div class='camera-section'>
						<b>{game.i18n?.localize('obs-utils.applications.director.cameraSmoothingHeader')}</b>
						<div class='smoothing-row'>
							<label for='cameraEasing' class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.easing')}</label>
							<select id='cameraEasing' bind:value={$cameraEasing} disabled={isDisabled}>
								{#each easingOptions as opt}
									<option value={opt.value}>{game.i18n?.localize(opt.labelKey)}</option>
								{/each}
							</select>
						</div>
						<div class='smoothing-row'>
							<label for='cameraSmoothing' class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.duration')}</label>
							<input id='cameraSmoothing' type='range' min='0' max='1500' step='50' bind:value={$cameraSmoothing} disabled={isDisabled} />
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
							onchange={onChangePlayer}
							disabled={isDisabled}
						>
							{#each players as { id, name }}
								<option value={id}>{name}</option>
							{/each}
						</select>
					</div>
					<div class='mode-row'>
						<div class='controls-row'>
							<input
								name='limitCanvas'
								id='limitCanvas'
								type='checkbox'
								bind:checked={$clampCanvas}
								disabled={isDisabled}
							/>
							<label
								class='button'
								class:disabled={isDisabled}
								title={game.i18n?.localize('obs-utils.strings.limitCanvas')}
								for='limitCanvas'><i class='fas fa-arrows-maximize'></i></label
							>
							<input
								name='pauseCameraTracking'
								id='pauseCameraTracking'
								type='checkbox'
								bind:checked={$pauseCameraTracking}
								disabled={isDisabled}
							/>
							<label
								class='button'
								class:disabled={isDisabled}
								title={game.i18n?.localize('obs-utils.strings.pauseCameraTracking')}
								for='pauseCameraTracking'><i class='fas fa-pause'></i></label
							>
							<input
								name='forceOpenSettingsForOBSUser'
								id='forceOpenSettingsForOBSUser'
								type='button'
								onclick={() => sendOpenSettingsConfig()}
								disabled={isDisabled}
							/>
							<label
								class='button'
								class:disabled={isDisabled}
								title={game.i18n?.localize('obs-utils.applications.director.forceOpenSettingsForOBSUser')}
								for='forceOpenSettingsForOBSUser'><i class='fas fa-cog'></i></label
							>
						</div>
					</div>
				</div>
			</div>
		{:else if activeTab === 'codms'}
			{#if showCoDMs}
				<b>{game.i18n?.localize('obs-utils.applications.director.coDMsHeader')}</b>
				<ul class='codm-list'>
					{#each allGMs as gm}
						{@const isActive = gm.id === activeGMId}
						{@const isMe = gm.id === myUserId}
						{@const isOnline = !!gm.active}
						<li class='codm' class:active={isActive} class:offline={!isOnline} class:me={isMe}>
							<span class='status' class:online={isOnline} aria-hidden='true'></span>
							<span class='name' title={gm.name}>{gm.name}{isMe ? ' (you)' : ''}</span>
							{#if isActive}
								<span class='badge'>
									<i class='fas fa-star'></i>
									{game.i18n?.localize('obs-utils.applications.director.codmInControl')}
								</span>
							{:else if !isOnline}
								<span class='badge offline-tag'>{game.i18n?.localize('obs-utils.applications.director.codmOffline')}</span>
							{:else if isMe && (game as ReadyGame).user?.isGM && activeGMId}
								<button
									type='button'
									class='take-control'
									onclick={() => takeControl(activeGMId)}
									title={game.i18n?.localize('obs-utils.applications.director.takeControl')}
								>{game.i18n?.localize('obs-utils.applications.director.takeControl')}</button>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<div class='empty-codms'>
					<i class='fas fa-user-check'></i>
					<p>{game.i18n?.localize('obs-utils.applications.director.coDMsEmpty')}</p>
				</div>
			{/if}

		{/if}
	</section>
</main>

<style lang='stylus'>
	main
		display flex
		flex-direction column
		height 100%
		gap 8px

	.warning
		background-color #ffeb3b
		color #333
		padding 8px 10px
		border-radius 4px
		border 2px solid #ffc107
		display flex
		align-items center
		gap 8px
		font-weight bold
		font-size 12px

		i
			font-size 16px
			color #ff9800

	.tab-bar
		display flex
		gap 2px
		flex 0 0 auto
		border-bottom 1px solid rgba(255, 255, 255, 0.1)

		button
			flex 1 1 auto
			height 32px
			display flex
			align-items center
			justify-content center
			gap 6px
			background transparent
			border 1px solid transparent
			border-bottom none
			border-radius 4px 4px 0 0
			font-size 12px
			color inherit
			cursor pointer
			padding 0 10px

			i
				font-size 11px
				opacity 0.75

			&:hover
				background rgba(255, 255, 255, 0.05)

			&.active
				background rgba(255, 144, 0, 0.15)
				border-color rgba(255, 144, 0, 0.45)
				border-bottom-color transparent
				font-weight 600

	.tab-body
		flex 1 1 auto
		min-height 0
		overflow-y auto
		display flex
		flex-direction column
		gap 12px
		padding 4px 2px

	.controls-grid
		display grid
		grid-template-columns 3fr 2fr
		gap 12px
		// fr units distribute space remaining *after* gap, so the row never overflows.

		.col
			display flex
			flex-direction column
			gap 10px
			min-width 0

	// Radios, checkboxes, and button-style inputs are hidden — their <label>
	// renders the visual button. Other input types (range, text, etc.) stay
	// visible so we don't get ghost elements parked at viewport (0,0).
	input[type=radio],
	input[type=checkbox],
	input[type=button]
		opacity 0
		position fixed
		width 0

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

	.codm-list
		list-style none
		margin 0
		padding 0
		display flex
		flex-direction column
		gap 4px

	.codm
		display grid
		grid-template-columns 10px 1fr auto
		gap 8px
		align-items center
		padding 4px 8px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.07)
		border-radius 4px

		&.active
			background rgba(255, 144, 0, 0.12)
			border-color rgba(255, 144, 0, 0.4)

		&.offline
			opacity 0.55

		.status
			width 8px
			height 8px
			border-radius 50%
			background #666
			align-self center

			&.online
				background #4caf50
				box-shadow 0 0 4px rgba(76, 175, 80, 0.6)

		.name
			font-size 12px
			white-space nowrap
			overflow hidden
			text-overflow ellipsis

		.badge
			display inline-flex
			align-items center
			gap 4px
			font-size 10px
			text-transform uppercase
			letter-spacing 0.5px
			opacity 0.85

			i
				color #ff9000

			&.offline-tag
				opacity 0.6

		.take-control
			height 24px
			padding 0 10px
			font-size 11px
			background rgba(255, 144, 0, 0.18)
			border 1px solid rgba(255, 144, 0, 0.45)
			border-radius 3px
			cursor pointer
			opacity 1
			position relative
			width auto

			&:hover
				background rgba(255, 144, 0, 0.3)
				border-color rgba(255, 144, 0, 0.7)

	.empty-codms
		display flex
		flex-direction column
		align-items center
		text-align center
		padding 20px
		gap 10px
		opacity 0.7

		i
			font-size 24px
			color #4caf50
			opacity 0.6

		p
			margin 0
			font-size 12px
			max-width 320px
			line-height 1.4

	.codms-utility
		margin-top 8px
		padding-top 8px
		border-top 1px solid rgba(255, 255, 255, 0.08)
		display flex
		flex-direction column
		gap 6px

		b
			font-size 11px
			text-transform uppercase
			letter-spacing 0.5px
			opacity 0.75

		.controls-row
			display flex
			gap 6px
</style>
