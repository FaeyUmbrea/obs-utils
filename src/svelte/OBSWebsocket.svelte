<script lang='ts'>

	import { getContext, onDestroy } from 'svelte';
	import { generateDataBlockFromSetting, getSetting, setSetting } from '../utils/settings.ts';
	import { sendOBSSetting } from '../utils/socket.ts';

	const websocketSettings = getSetting('websocketSettings');
	export let elementRoot = void 0;

	const context = getContext('#external');

	async function submit() {
		await setSetting('websocketSettings', websocketSettings);
		await context.application.close();
	}

	let { onlineUsers } = generateDataBlockFromSetting();
	let currentTrackedPlayer = game?.user.id;

	const hook = Hooks.on('userConnected', () => {
		onlineUsers = generateDataBlockFromSetting().onlineUsers;
		if (
			onlineUsers.find(element => element.id === currentTrackedPlayer)
			=== undefined
		) {
			currentTrackedPlayer = game?.user.id;
		}
	});

	onDestroy(() => {
		Hooks.off('userConnected', hook);
	});

	function sync() {
		sendOBSSetting(currentTrackedPlayer, websocketSettings);
	}
</script>

<main>
	<hr />
	<div class='flexcol'>
		{game.i18n.localize('obs-utils.applications.obsWebsocket.urlLabel')}<input
			bind:value={websocketSettings.url}
			name='url'
			type='text'
		/>
		<br />
		{game.i18n.localize('obs-utils.applications.obsWebsocket.portLabel')}
		<input bind:value={websocketSettings.port} name='port' type='number' />
		<br />
		{game.i18n.localize('obs-utils.applications.obsWebsocket.passwordLabel')}
		<input
			bind:value={websocketSettings.password}
			name='password'
			type='password'
		/>
		<hr />
		<button on:click={submit} type='submit'
		>{game.i18n.localize('obs-utils.applications.obsWebsocket.saveButton')}</button
		>
		<hr />
		{game.i18n.localize('obs-utils.applications.obsWebsocket.syncLabel')}
		<div>
			<select
				bind:value={currentTrackedPlayer}
				name='trackedPlayer'
				id='trackedPlayer'
			>
				{#each onlineUsers as { id, name }}
					<option value={id}>{name}</option>
				{/each}
			</select>
			<br />
			<button on:click={sync} type='submit'
			>{game.i18n.localize('obs-utils.applications.obsWebsocket.syncButton')}</button
			>
		</div>
	</div>
</main>
