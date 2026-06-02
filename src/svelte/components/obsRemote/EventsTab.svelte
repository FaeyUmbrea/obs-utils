<svelte:options runes={true} />
<script lang='ts'>
	import { getApi } from '../../../utils/helpers.ts';
	import { settings } from '../../../utils/settings.ts';
	import ObsTab from '../OBSTab.svelte';
	import Select from '../select/Select.svelte';

	const useWebSocket = settings.getReadableStore('enableOBSWebsocket');
	const obsSettings = settings.getStore('obsRemote');

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
</script>

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

<style>
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
</style>
