<svelte:options runes={true} />
<script lang='ts'>
	import Select from 'svelte-select';
	import { settings } from '../utils/settings.ts';
	import ObsTab from './components/OBSTab.svelte';
	import SceneSelect from './components/SceneSelect.svelte';

	const useWebSocket = settings.getReadableStore('enableOBSWebsocket');
	const obsSettings = settings.getStore('obsRemote');

	const entries = useWebSocket
		? Object.getOwnPropertyNames($obsSettings)
		: Object.getOwnPropertyNames($obsSettings).filter(entry => entry !== 'onStopStreaming');

	function formatKey(key) {
		return game.i18n.localize(`obs-utils.applications.obsRemote.${key}`);
	}

	const { foundryApp } = $props();

	async function submit() {
		await foundryApp.close();
	}

	let handleAdd = $state();

	let selection = $state('');

	function getTabData() {
		return $obsSettings[selection];
	}

	function setTabData(value) {
		console.error(value);
		$obsSettings[selection] = value;
	}

</script>

<main>
	<div class='header'>
		<Select
			bind:justValue={selection}
			value={entries[0]}
			items={entries}
			searchable={false}
			clearable={false}
			--background='var(--sidebar-background)'
			--list-background='var(--sidebar-background)'
			--item-hover-bg='var(--sidebar-entry-hover-bg)'
		>
			<div slot='selection' let:selection>
				<i
					class="fas {selection.value === 'onStopStreaming'
						? 'fa-signal-stream'
						: 'fa-dice-d20'}"
				></i>
				{formatKey(selection.value)}
			</div>
			<div slot='item' let:item>
				<i
					class="fas {item.value === 'onStopStreaming'
						? 'fa-signal-stream'
						: 'fa-dice-d20'}"
				></i>
				{formatKey(item.value)}
			</div>
		</Select>
		<button
			aria-label='add'
			class='add'
			onclick={() => {
				if (handleAdd !== undefined) handleAdd();
			}}
			type='button'><i class='fas fa-plus'></i></button
		>
	</div>
	<hr />
	<div>
		<section class='content'>
			{#if selection === 'onSceneLoad'}
				<SceneSelect
					bind:handleAdd={handleAdd}
					bind:eventArray={() => getTabData(), v => setTabData(v)}
					useWebSocket={$useWebSocket}
				/>
			{:else if selection !== ''}
				{#key selection}
					<ObsTab
						bind:handleAdd={handleAdd}
						bind:eventArray={() => getTabData(selection), v => setTabData(v)}
						useWebSocket={$useWebSocket}
					/>
				{/key}
			{/if}
		</section>
		<footer>
			<hr />
			<button class='submit' onclick={submit}
			>{game.i18n?.localize('obs-utils.strings.done')}</button
			>
		</footer>
	</div>
</main>

<style>
  .header {
    display: grid;
    grid-template-columns: auto 45px;
  }
  footer {
    position: absolute;
    width: 100%;
    bottom: 0;
    left: 0;
    padding: 10px;
  }
  button {
      height: 40px;
      width: 100%;
  }
</style>
