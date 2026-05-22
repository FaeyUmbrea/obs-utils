<svelte:options runes={true} />
<script lang='ts'>
	import { onDestroy } from 'svelte';
	import { getApi } from '../utils/helpers.ts';
	import { generateDataBlockFromSetting, getSetting, setSetting, settings } from '../utils/settings.ts';
	import { sendOBSSetting } from '../utils/socket.ts';
	import ObsTab from './components/OBSTab.svelte';
	import Select from './components/select/Select.svelte';

	const useWebSocket = settings.getReadableStore('enableOBSWebsocket');
	const obsSettings = settings.getStore('obsRemote');

	type MenuTab = 'connection' | 'events';
	let activeTab = $state<MenuTab>('connection');

	// ─── Connection (websocket) state ─────────────────────────────────────
	const websocketSettings = getSetting('websocketSettings');
	let onlineUsers = $state(generateDataBlockFromSetting().onlineUsers);
	let currentTrackedPlayer = $state(game?.user.id);

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

	// ─── Events (registry-driven) state ───────────────────────────────────
	const allRegistrations = Array.from(getApi().obsRemoteEventTypes.values());
	const visibleRegistrations = $derived.by(() => {
		return $useWebSocket
			? allRegistrations
			: allRegistrations.filter(r => r.key !== 'core.onStopStreaming');
	});

	let selectedKey = $state('');
	$effect.pre(() => {
		if (!selectedKey) selectedKey = visibleRegistrations[0]?.key ?? '';
	});
	const selectedReg = $derived(visibleRegistrations.find(r => r.key === selectedKey));
	const hasConditions = $derived((selectedReg?.conditionFields?.length ?? 0) > 0);

	function getInstances(): { conditions: Record<string, any>; actions: any[] }[] {
		return (($obsSettings as any)?.customEvents?.[selectedKey] ?? []) as any[];
	}
	function setInstances(value: any[]) {
		const next = { ...(($obsSettings as any).customEvents ?? {}) };
		next[selectedKey] = value;
		$obsSettings = { ...$obsSettings, customEvents: next };
	}

	function defaultConditions(): Record<string, any> {
		const out: Record<string, any> = {};
		for (const f of selectedReg?.conditionFields ?? []) {
			out[f.key] = f.default ?? (f.type === 'boolean' ? false : f.type === 'number' ? 0 : '');
		}
		return out;
	}

	function addInstance() {
		setInstances([...getInstances(), { conditions: defaultConditions(), actions: [] }]);
	}
	function removeInstance(idx: number) {
		const next = getInstances().slice();
		next.splice(idx, 1);
		setInstances(next);
	}
	function updateCondition(idx: number, key: string, value: any) {
		const next = getInstances().slice();
		next[idx] = { ...next[idx], conditions: { ...(next[idx].conditions ?? {}), [key]: value } };
		setInstances(next);
	}
	function getInstanceActions(idx: number) {
		return getInstances()[idx]?.actions ?? [];
	}
	function setInstanceActions(idx: number, actions: any[]) {
		const next = getInstances().slice();
		next[idx] = { ...next[idx], actions };
		setInstances(next);
	}

	function getSingleActions() {
		return getInstances()[0]?.actions ?? [];
	}
	function setSingleActions(actions: any[]) {
		setInstances([{ conditions: {}, actions }]);
	}

	let handleAddSingle = $state<(() => void) | undefined>(undefined);
	const perInstanceHandleAdd = $state<Record<number, (() => void) | undefined>>({});

	function onEventsAddClick() {
		if (hasConditions) addInstance();
		else handleAddSingle?.();
	}

	function formatName(reg: { name: string }) {
		return game.i18n?.localize(reg.name);
	}

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
	{:else}
		<div class='header'>
			<Select
				bind:value={selectedKey}
				options={visibleRegistrations.map(r => ({ value: r.key, label: formatName(r), icon: r.icon ?? 'fas fa-bolt' }))}
				searchable={false}
			/>
			<button
				aria-label={hasConditions
					? game.i18n?.localize('obs-utils.applications.obsRemote.addInstance')
					: game.i18n?.localize('obs-utils.applications.obsRemote.addAction')}
				class='add'
				onclick={onEventsAddClick}
				type='button'
				title={hasConditions
					? game.i18n?.localize('obs-utils.applications.obsRemote.addInstance')
					: game.i18n?.localize('obs-utils.applications.obsRemote.addAction')}
			><i class='fas fa-plus'></i></button>
		</div>
		<hr />

		<section class='content'>
			{#if selectedReg}
				{#if !hasConditions}
					{#key selectedKey}
						<ObsTab
							bind:handleAdd={handleAddSingle}
							bind:eventArray={() => getSingleActions(), v => setSingleActions(v)}
							useWebSocket={$useWebSocket}
						/>
					{/key}
				{:else}
					{@const instances = getInstances()}
					<div class='instances'>
						{#each instances as inst, idx (idx)}
							<div class='instance'>
								<header class='instance-header'>
									<span class='instance-label'>
										{game.i18n?.localize('obs-utils.applications.obsRemote.instance')} #{idx + 1}
									</span>
									<button
										type='button'
										class='remove-instance'
										onclick={() => removeInstance(idx)}
										title={game.i18n?.localize('obs-utils.applications.obsRemote.removeInstance')}
									><i class='fas fa-trash'></i></button>
								</header>
								<div class='conditions'>
									{#each selectedReg.conditionFields ?? [] as field (field.key)}
										<label class='condition-field'>
											<span>{game.i18n?.localize(field.label)}</span>
											{#if field.type === 'number'}
												<input
													type='number'
													value={inst.conditions[field.key] ?? 0}
													onchange={e => updateCondition(idx, field.key, Number((e.currentTarget as HTMLInputElement).value))}
												/>
											{:else if field.type === 'boolean'}
												<input
													type='checkbox'
													checked={!!inst.conditions[field.key]}
													onchange={e => updateCondition(idx, field.key, (e.currentTarget as HTMLInputElement).checked)}
												/>
											{:else}
												<input
													type='text'
													value={inst.conditions[field.key] ?? ''}
													onchange={e => updateCondition(idx, field.key, (e.currentTarget as HTMLInputElement).value)}
												/>
											{/if}
										</label>
									{/each}
								</div>
								<ObsTab
									bind:handleAdd={() => perInstanceHandleAdd[idx], v => (perInstanceHandleAdd[idx] = v)}
									bind:eventArray={() => getInstanceActions(idx), v => setInstanceActions(idx, v)}
									useWebSocket={$useWebSocket}
								/>
								<button
									type='button'
									class='add-action-inline'
									onclick={() => perInstanceHandleAdd[idx]?.()}
								>
									<i class='fas fa-plus'></i>
									{game.i18n?.localize('obs-utils.applications.obsRemote.addAction')}
								</button>
							</div>
						{/each}
						{#if instances.length === 0}
							<div class='empty-instances'>
								{game.i18n?.localize('obs-utils.applications.obsRemote.noInstancesYet')}
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</section>
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
	.header {
		display: grid;
		grid-template-columns: 1fr 38px;
		gap: 6px;
		flex: 0 0 auto;
		align-items: center;
	}
	.add {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 38px;
		width: 38px;
		background: rgba(255, 144, 0, 0.15);
		border: 1px solid rgba(255, 144, 0, 0.45);
		border-radius: 3px;
		font-size: 13px;
		cursor: pointer;
	}
	.add:hover {
		background: rgba(255, 144, 0, 0.25);
		border-color: rgba(255, 144, 0, 0.7);
	}
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
	.instances {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.instance {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.instance-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.instance-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		opacity: 0.7;
	}
	.remove-instance {
		width: 28px;
		height: 24px;
		padding: 0;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		opacity: 0.7;
	}
	.remove-instance:hover {
		opacity: 1;
		background: rgba(220, 60, 60, 0.15);
		border-color: rgba(220, 60, 60, 0.4);
	}
	.conditions {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.condition-field {
		display: grid;
		grid-template-columns: 140px 1fr;
		align-items: center;
		gap: 8px;
	}
	.condition-field span {
		font-size: 12px;
		opacity: 0.85;
	}
	.condition-field input[type=text],
	.condition-field input[type=number] {
		height: 26px;
		padding: 0 6px;
	}
	.add-action-inline {
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: rgba(255, 144, 0, 0.12);
		border: 1px solid rgba(255, 144, 0, 0.4);
		border-radius: 3px;
		font-size: 12px;
		cursor: pointer;
	}
	.empty-instances {
		opacity: 0.6;
		font-style: italic;
		font-size: 12px;
		padding: 12px;
		text-align: center;
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
