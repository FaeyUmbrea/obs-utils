<svelte:options runes={true} />
<script lang='ts'>
	import { getGM, isOBS } from '../utils/helpers.ts';
	import { generateDataBlockFromSetting, settings } from '../utils/settings.ts';
	import { sendOpenSettingsConfig } from '../utils/socket.ts';

	const { ic, ooc, players } = generateDataBlockFromSetting();
	const currentIC = settings.getStore('defaultInCombat');
	const currentOOC = settings.getStore('defaultOutOfCombat');
	const currentTrackedPlayer = settings.getStore('trackedUser');
	const clampCanvas = settings.getStore('clampCanvas');
	const pauseCameraTracking = settings.getStore('pauseCameraTracking');
	const isDisabled = getGM()?.active !== true;

	async function onChangeIC(event: Event) {
		$currentIC = event.target.value;
	}

	async function onChangeOOC(event: Event) {
		$currentOOC = event.target.value;
	}

	async function onChangePlayer(event: Event) {
		$currentTrackedPlayer = event.target.value;
	}
</script>

<main>
	{#if isDisabled}
		<div class='warning'>
			<i class='fas fa-exclamation-triangle'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.noGMWarning')}</span>
		</div>
	{/if}
	<section>
		<b>{game.i18n?.localize('obs-utils.applications.director.icTypeHeader')}</b>
		<div>
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
				<label class='button' class:disabled={isDisabled} for='radioic{id}' title={game.i18n?.localize(tooltip)}
				><i class={icon}></i></label
				>
			{/each}
		</div>
		<hr />
		<b>{game.i18n?.localize('obs-utils.applications.director.oocTypeHeader')}</b>
		<div>
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
				<label class='button' class:disabled={isDisabled} for='radioooc{id}' title={game.i18n?.localize(tooltip)}
				><i class={icon}></i></label
				>
			{/each}
		</div>
		<div>
			<hr />
			<b>{game.i18n?.localize('obs-utils.applications.director.canvasOptionsHeader')}</b>
			<hr />
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
		</div>
	</section>
	<section>
		<div>
			<b>{game.i18n?.localize('obs-utils.applications.director.trackedPlayerHeader')}</b>
			<hr />
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
		<div>
			<hr />
			<b>{game.i18n?.localize('obs-utils.applications.director.obsUserCommands')}</b>
			<hr />
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
	</section>
</main>

<style lang='stylus'>
    main
      display grid
      grid-template-columns 60% 40%
      grid-gap 10px

  .warning
    grid-column 1 / -1
    background-color #ffeb3b
    color #333
    padding 10px
    border-radius 4px
    border 2px solid #ffc107
    display flex
    align-items center
    gap 10px
    font-weight bold

  .warning i
    font-size 20px
    color #ff9800

  input
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

  label i
    display flex
    justify-content center
    align-items center
    font-size 18px

  label:hover
    background-color #dfd

  input:checked + label
    border-color #4c4

  label.button.disabled
    opacity 0.5
    cursor not-allowed
    pointer-events none

  label.button.disabled:hover
    background-color transparent

</style>
