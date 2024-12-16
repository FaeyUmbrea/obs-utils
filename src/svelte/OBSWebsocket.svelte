<svelte:options accessors={true} />

<script>
	import { ApplicationShell } from '#runtime/svelte/component/application';
	import { localize } from '#runtime/util/i18n';
	import { getContext, onDestroy } from 'svelte';
	import { generateDataBlockFromSetting, settings } from '../utils/settings.ts';
	import { sendOBSSetting } from '../utils/socket.ts';

	const websocketSettings = settings.getStore('websocketSettings');
	export let elementRoot = void 0;

	const context = getContext('#external');

	async function submit() {
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
		sendOBSSetting(currentTrackedPlayer, $websocketSettings);
	}
</script>

<ApplicationShell bind:elementRoot={elementRoot}>
	<main>
		<hr />
		<div class='flexcol'>
			{localize('obs-utils.applications.obsWebsocket.urlLabel')}<input
				bind:value={$websocketSettings.url}
				name='url'
				type='text'
			/>
			<br />
			{localize('obs-utils.applications.obsWebsocket.portLabel')}
			<input bind:value={$websocketSettings.port} name='port' type='number' />
			<br />
			{localize('obs-utils.applications.obsWebsocket.passwordLabel')}
			<input
				bind:value={$websocketSettings.password}
				name='password'
				type='password'
			/>
			<hr />
			<button on:click={submit} type='submit'
			>{localize('obs-utils.applications.obsWebsocket.saveButton')}</button
			>
			<hr />
			{localize('obs-utils.applications.obsWebsocket.syncLabel')}
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
				>{localize('obs-utils.applications.obsWebsocket.syncButton')}</button
				>
			</div>
		</div>
	</main>
</ApplicationShell>
