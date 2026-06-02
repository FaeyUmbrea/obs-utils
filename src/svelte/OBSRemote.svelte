<svelte:options runes={true} />
<script lang='ts'>
	import ConnectionTab from './components/obsRemote/ConnectionTab.svelte';
	import EventsTab from './components/obsRemote/EventsTab.svelte';

	type MenuTab = 'connection' | 'events';
	let activeTab = $state<MenuTab>('connection');

	const { foundryApp } = $props();

	async function submit() {
		await foundryApp.close();
	}
</script>

<main>
	<div class='menu-tabs' role='tablist'>
		<button
			type='button'
			role='tab'
			class:active={activeTab === 'connection'}
			aria-selected={activeTab === 'connection'}
			onclick={() => (activeTab = 'connection')}
		>
			<i class='fas fa-plug'></i>
			<span>{game.i18n?.localize('obs-utils.applications.obsRemote.tabConnection')}</span>
		</button>
		<button
			type='button'
			role='tab'
			class:active={activeTab === 'events'}
			aria-selected={activeTab === 'events'}
			onclick={() => (activeTab = 'events')}
		>
			<i class='fas fa-bolt'></i>
			<span>{game.i18n?.localize('obs-utils.applications.obsRemote.tabEvents')}</span>
		</button>
	</div>
	<hr />

	{#if activeTab === 'connection'}
		<ConnectionTab />
	{:else}
		<EventsTab />
	{/if}

	<footer>
		<hr />
		<button class='submit' onclick={submit}>{game.i18n?.localize('obs-utils.strings.done')}</button>
	</footer>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	.menu-tabs {
		display: flex;
		gap: 4px;
		flex: 0 0 auto;
	}
	.menu-tabs button {
		flex: 1 1 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 32px;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		font-size: 13px;
		cursor: pointer;
		opacity: 0.75;
	}
	.menu-tabs button.active {
		opacity: 1;
		background: rgba(255, 144, 0, 0.12);
		border-color: rgba(255, 144, 0, 0.4);
	}
	footer {
		flex: 0 0 auto;
		padding: 6px 0 0 0;
	}
	.submit {
		height: 36px;
		width: 100%;
	}
</style>
