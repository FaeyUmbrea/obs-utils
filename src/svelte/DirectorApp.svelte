<script lang='ts'>
	import { generateDataBlockFromSetting, settings } from '../utils/settings.ts';
	import { sendOpenSettingsConfig } from '../utils/socket.ts';

	const { ic, ooc, players } = generateDataBlockFromSetting();
	const currentIC = settings.getStore('defaultInCombat');
	const currentOOC = settings.getStore('defaultOutOfCombat');
	const currentTrackedPlayer = settings.getStore('trackedUser');
	const clampCanvas = settings.getStore('clampCanvas');
	const pauseCameraTracking = settings.getStore('pauseCameraTracking');

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
				/>
				<label class='button' for='radioic{id}' title={game.i18n?.localize(tooltip)}
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
				/>
				<label class='button' for='radioooc{id}' title={game.i18n?.localize(tooltip)}
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
			/>
			<label
				class='button'
				title={game.i18n?.localize('obs-utils.strings.limitCanvas')}
				for='limitCanvas'><i class='fas fa-arrows-maximize'></i></label
			>
			<input
				name='pauseCameraTracking'
				id='pauseCameraTracking'
				type='checkbox'
				bind:checked={$pauseCameraTracking}
			/>
			<label
				class='button'
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
			/>
			<label
				class='button'
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

</style>
