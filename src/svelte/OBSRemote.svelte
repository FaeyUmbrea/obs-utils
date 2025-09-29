<svelte:options runes={true} />
<script lang='ts'>
	import Select from 'svelecte';
	import { settings } from '../utils/settings.ts';
	import ObsTab from './components/OBSTab.svelte';
	import SceneSelect from './components/SceneSelect.svelte';

	const useWebSocket = settings.getReadableStore('enableOBSWebsocket');
	const obsSettings = settings.getStore('obsRemote');

	const entries = useWebSocket
		? Object.getOwnPropertyNames($obsSettings)
		: Object.getOwnPropertyNames($obsSettings).filter(entry => entry !== 'onStopStreaming');

	function formatKey(key: string) {
		return game.i18n?.localize(`obs-utils.applications.obsRemote.${key}`);
	}

	const { foundryApp } = $props();

	async function submit() {
		await foundryApp.close();
	}

	let handleAdd = $state<() => void | Promise<void> | undefined>(undefined);

	let selected = $state(entries[0]);

	function getTabData() {
		return $obsSettings[selected];
	}

	function setTabData(value: any) {
		$obsSettings[selected] = value;
	}

</script>

<main>
	<div class='header'>
		<Select
			bind:value={selected}
			options={entries}
			searchable={false}
			clearable={false}
			--sv-bg='var(--sidebar-background)'
			--sv-dropdown-active-bg='var(--sidebar-entry-hover-bg)'
		>
			{#snippet option(opt)}
				<div>
					<i
						class="fas {opt.text === 'onStopStreaming'
							? 'fa-signal-stream'
							: 'fa-dice-d20'}"
					></i>
					{formatKey(opt.text)}
				</div>
			{/snippet}
			{#snippet selection(selectedOptions)}
				<div>
					<i
						class="fas {selectedOptions[0].text === 'onStopStreaming'
							? 'fa-signal-stream'
							: 'fa-dice-d20'}"
					></i>
					{formatKey(selectedOptions[0].text)}
				</div>
			{/snippet}

		</Select>
		<button
			aria-label='add'
			class='add'
			onclick={() => {
				if (handleAdd !== undefined && handleAdd !== null) handleAdd();
			}}
			type='button'><i class='fas fa-plus'></i></button
		>
	</div>
	<hr />
	<div>
		<section class='content'>
			{#if selected === 'onSceneLoad'}
				<SceneSelect
					bind:handleAdd={handleAdd}
					bind:eventArray={() => getTabData(), v => setTabData(v)}
					useWebSocket={$useWebSocket}
				/>
			{:else if selected !== ''}
				{#key selected}
					<ObsTab
						bind:handleAdd={handleAdd}
						bind:eventArray={() => getTabData(), v => setTabData(v)}
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
