<svelte:options runes={true} />
<script lang='ts'>
	import { onDestroy } from 'svelte';
	import { generateDataBlockFromSetting, getSetting, setSetting } from '../../../utils/settings.ts';
	import { sendOBSSetting } from '../../../utils/socket.ts';

	const websocketSettings = getSetting('websocketSettings');
	let onlineUsers = $state(generateDataBlockFromSetting().onlineUsers);
	let currentTrackedPlayer = $state(game?.user.id);

	// Listener lives here rather than in the orchestrator so it co-locates with
	// the UI that consumes it. It only runs while this tab is mounted, which is
	// fine — onlineUsers is not displayed on any other tab.
	const userConnectedHook = Hooks.on('userConnected', () => {
		onlineUsers = generateDataBlockFromSetting().onlineUsers;
		if (!onlineUsers.some(element => element.id === currentTrackedPlayer)) {
			currentTrackedPlayer = game?.user.id;
		}
	});
	onDestroy(() => Hooks.off('userConnected', userConnectedHook));

	async function saveConnection() {
		await setSetting('websocketSettings', websocketSettings);
	}
	function sync() {
		sendOBSSetting(currentTrackedPlayer, websocketSettings);
	}
</script>

<section class='content connection'>
	<label class='field'>
		<span>{game.i18n?.localize('obs-utils.applications.obsWebsocket.urlLabel')}</span>
		<input bind:value={websocketSettings.url} name='url' type='text' />
	</label>
	<label class='field'>
		<span>{game.i18n?.localize('obs-utils.applications.obsWebsocket.portLabel')}</span>
		<input bind:value={websocketSettings.port} name='port' type='number' />
	</label>
	<label class='field'>
		<span>{game.i18n?.localize('obs-utils.applications.obsWebsocket.passwordLabel')}</span>
		<input bind:value={websocketSettings.password} name='password' type='password' />
	</label>
	<button class='save' onclick={saveConnection} type='button'>
		{game.i18n?.localize('obs-utils.applications.obsWebsocket.saveButton')}
	</button>
	<hr />
	<div class='sync'>
		<span class='sync-label'>{game.i18n?.localize('obs-utils.applications.obsWebsocket.syncLabel')}</span>
		<select bind:value={currentTrackedPlayer} name='trackedPlayer' id='trackedPlayer'>
			{#each onlineUsers as { id, name } (id)}
				<option value={id}>{name}</option>
			{/each}
		</select>
		<button onclick={sync} type='button'>
			{game.i18n?.localize('obs-utils.applications.obsWebsocket.syncButton')}
		</button>
	</div>
</section>

<style>
	.content {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding: 4px 0;
	}
	.content.connection {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.field {
		display: grid;
		grid-template-columns: 110px 1fr;
		align-items: center;
		gap: 8px;
	}
	.field input {
		height: 26px;
		padding: 0 6px;
	}
	.save {
		height: 32px;
		align-self: flex-end;
		padding: 0 16px;
	}
	.sync {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		gap: 6px 8px;
		align-items: center;
	}
	.sync-label {
		grid-column: 1 / -1;
		font-size: 12px;
		opacity: 0.85;
	}
	.sync select {
		height: 28px;
	}
	.sync button {
		height: 28px;
		padding: 0 12px;
	}
</style>
