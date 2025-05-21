<svelte:options accessors={true} />

<script>
	import { ApplicationShell } from '#runtime/svelte/component/application';
	import { localize } from '#runtime/util/i18n';
	import { generateDataBlockFromSetting, settings } from '../utils/settings.ts';
	import { sendOpenSettingsConfig } from '../utils/socket.ts';

	const { ic, ooc, players } = generateDataBlockFromSetting();
	const currentIC = settings.getStore('defaultInCombat');
	const currentOOC = settings.getStore('defaultOutOfCombat');
	const currentTrackedPlayer = settings.getStore('trackedUser');
	const clampCanvas = settings.getStore('clampCanvas');
	const pauseCameraTracking = settings.getStore('pauseCameraTracking');

	async function onChangeIC(event) {
		$currentIC = event.target.value;
	}

	async function onChangeOOC(event) {
		$currentOOC = event.target.value;
	}

	async function onChangePlayer(event) {
		$currentTrackedPlayer = event.target.value;
	}

	export let elementRoot = void 0;
</script>

<ApplicationShell bind:elementRoot={elementRoot}>
	<main>
		<section>
			<b>{localize('obs-utils.applications.director.icTypeHeader')}</b>
			<div>
				{#each ic as { id, tooltip, icon }}
					<input
						type='radio'
						bind:group={$currentIC}
						id='radioic{id}'
						name='currentIC'
						value={id}
						on:change={onChangeIC}
					/>
					<label class='button' for='radioic{id}' title={localize(tooltip)}
					><i class={icon}></i></label
					>
				{/each}
			</div>
			<hr />
			<b>{localize('obs-utils.applications.director.oocTypeHeader')}</b>
			<div>
				{#each ooc as { id, tooltip, icon }}
					<input
						type='radio'
						bind:group={$currentOOC}
						id='radioooc{id}'
						name='currentOOC'
						value={id}
						on:change={onChangeOOC}
					/>
					<label class='button' for='radioooc{id}' title={localize(tooltip)}
					><i class={icon}></i></label
					>
				{/each}
			</div>
			<div>
				<hr />
				<b>{localize('obs-utils.applications.director.canvasOptionsHeader')}</b>
				<hr />
				<input
					name='limitCanvas'
					id='limitCanvas'
					type='checkbox'
					bind:checked={$clampCanvas}
				/>
				<label
					class='button'
					title={localize('obs-utils.strings.limitCanvas')}
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
					title={localize('obs-utils.strings.pauseCameraTracking')}
					for='pauseCameraTracking'><i class='fas fa-pause'></i></label
				>
			</div>
		</section>
		<section>
			<div>
				<b>{localize('obs-utils.applications.director.trackedPlayerHeader')}</b>
				<hr />
				<select
					bind:value={$currentTrackedPlayer}
					name='trackedPlayer'
					id='trackedPlayer'
					on:change={onChangePlayer}
				>
					{#each players as { id, name }}
						<option value={id}>{name}</option>
					{/each}
				</select>
			</div>
			<div>
				<hr />
				<b>{localize('obs-utils.applications.director.obsUserCommands')}</b>
				<hr />
				<input
					name='forceOpenSettingsForOBSUser'
					id='forceOpenSettingsForOBSUser'
					type='button'
					on:click={() => sendOpenSettingsConfig()}
				/>
				<label
					class='button'
					title={localize('obs-utils.applications.director.forceOpenSettingsForOBSUser')}
					for='forceOpenSettingsForOBSUser'><i class='fas fa-cog'></i></label
				>
			</div>
		</section>
	</main>
</ApplicationShell>

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
