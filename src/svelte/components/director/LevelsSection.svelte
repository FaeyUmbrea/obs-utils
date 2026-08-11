<svelte:options runes={true} />
<script lang='ts'>
	import type { ReadyGame } from 'fvtt-types/configuration';
	import { onDestroy, onMount } from 'svelte';
	import {
		canUserViewLevel,
		getLevelChoices,
		getScenePins,
		getSceneTokenChoices,
		resolveLevelForTokens,
		sceneHasLevels,
		setScenePin,
	} from '../../../utils/levels.ts';
	import { settings } from '../../../utils/settings.ts';

	const { disabled = false } = $props<{ disabled?: boolean }>();

	const levelPolicy = settings.getStore('levelPolicy');
	const levelRelativeRule = settings.getStore('levelRelativeRule');
	const levelPins = settings.getStore('levelPins');
	const currentOOC = settings.getStore('defaultOutOfCombat');
	const obsModeUser = settings.getStore('obsModeUser');

	// Scene-dependent lists have to be rebuilt on every redraw: floors, tokens
	// and the active scene itself all change underneath this panel.
	let sceneEpoch = $state(0);
	function bump() {
		sceneEpoch += 1;
	}
	onMount(() => {
		Hooks.on('canvasReady', bump);
		Hooks.on('updateToken', bump);
	});
	onDestroy(() => {
		Hooks.off('canvasReady', bump);
		Hooks.off('updateToken', bump);
	});

	// `sceneEpoch` and `$levelPins` are read so these recompute on redraw and on
	// any pin write, including one made from another client. The reads look
	// pointless but are the dependency — the functions below read live Foundry
	// state, not anything reactive.
	const hasLevels = $derived.by(() => {
		void sceneEpoch;
		return sceneHasLevels();
	});
	const levels = $derived.by(() => {
		void sceneEpoch;
		return getLevelChoices();
	});
	const tokens = $derived.by(() => {
		void sceneEpoch;
		return getSceneTokenChoices();
	});
	const pins = $derived.by(() => {
		void sceneEpoch;
		void $levelPins;
		return getScenePins();
	});

	// Selects rather than the Director's icon-button radios: this panel sits in
	// the narrow right-hand column, and the button styling is scoped to
	// ControlsTab so it would not reach a child component anyway.
	const policyOptions = [
		{ value: 'relative', labelKey: 'obs-utils.strings.levelPolicyRelative' },
		{ value: 'token', labelKey: 'obs-utils.strings.levelPolicyToken' },
		{ value: 'pinned', labelKey: 'obs-utils.strings.levelPolicyPinned' },
	];

	const ruleOptions = [
		{ value: 'lowest', labelKey: 'obs-utils.strings.levelRelativeLowest' },
		{ value: 'middle', labelKey: 'obs-utils.strings.levelRelativeMiddle' },
		{ value: 'highest', labelKey: 'obs-utils.strings.levelRelativeHighest' },
	];

	/**
	 * The floor the OBS client is being asked to stand on right now.
	 *
	 * Recomputed here rather than reported back over the socket: the Director
	 * runs on the GM, who can see every token and every permission, so it can
	 * evaluate the OBS user's reachability directly.
	 */
	const targetLevelId = $derived.by(() => {
		void sceneEpoch;
		void $levelPolicy;
		void $levelRelativeRule;
		void pins;
		if (!hasLevels) return undefined;
		const placeables = ((game as ReadyGame).canvas?.tokens?.placeables ?? []) as Token[];
		return resolveLevelForTokens(placeables);
	});

	// A player-account OBS client may only stand on floors holding a token it can
	// observe. Warn here rather than letting the stream silently freeze on the
	// floor it was already showing.
	const blocked = $derived.by(() => {
		const id = targetLevelId;
		if (!id) return null;
		const userId = $obsModeUser;
		if (!userId || userId === 'none') return null;
		const user = (game as ReadyGame).users?.get(userId) as User | undefined;
		if (!user || canUserViewLevel(user, id)) return null;
		return levels.find(l => l.id === id)?.name ?? id;
	});

	function levelNameOf(id: string | undefined) {
		return levels.find(l => l.id === id)?.name ?? '';
	}
</script>

{#if hasLevels}
	<div class='levels-section'>
		<b>{game.i18n?.localize('obs-utils.applications.director.levelsHeader')}</b>

		<div class='row'>
			<span class='inline-label'>{game.i18n?.localize('obs-utils.settings.levelPolicy.Name')}</span>
			<select bind:value={$levelPolicy} {disabled}>
				{#each policyOptions as opt (opt.value)}
					<option value={opt.value}>{game.i18n?.localize(opt.labelKey)}</option>
				{/each}
			</select>
		</div>

		{#if $levelPolicy === 'relative'}
			<div class='row'>
				<span class='inline-label'>{game.i18n?.localize('obs-utils.settings.levelRelativeRule.Name')}</span>
				<select bind:value={$levelRelativeRule} {disabled}>
					{#each ruleOptions as opt (opt.value)}
						<option value={opt.value}>{game.i18n?.localize(opt.labelKey)}</option>
					{/each}
				</select>
			</div>
		{:else if $levelPolicy === 'token'}
			<div class='row'>
				<span class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.levelFollowToken')}</span>
				<select
					value={pins.levelToken ?? ''}
					onchange={e => setScenePin({ levelToken: (e.currentTarget as HTMLSelectElement).value || undefined })}
					{disabled}
				>
					<option value=''>{game.i18n?.localize('obs-utils.applications.director.levelNoSelection')}</option>
					{#each tokens as t (t.id)}
						<option value={t.id}>{t.name} — {levelNameOf(t.level)}</option>
					{/each}
				</select>
			</div>
		{:else}
			<div class='row'>
				<span class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.levelPinned')}</span>
				<select
					value={pins.level ?? ''}
					onchange={e => setScenePin({ level: (e.currentTarget as HTMLSelectElement).value || undefined })}
					{disabled}
				>
					<option value=''>{game.i18n?.localize('obs-utils.applications.director.levelNoSelection')}</option>
					{#each levels as l (l.id)}
						<option value={l.id}>{l.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		{#if $currentOOC === 'trackToken'}
			<div class='row'>
				<span class='inline-label'>{game.i18n?.localize('obs-utils.applications.director.trackedToken')}</span>
				<select
					value={pins.trackedToken ?? ''}
					onchange={e => setScenePin({ trackedToken: (e.currentTarget as HTMLSelectElement).value || undefined })}
					{disabled}
				>
					<option value=''>{game.i18n?.localize('obs-utils.applications.director.levelNoSelection')}</option>
					{#each tokens as t (t.id)}
						<option value={t.id}>{t.name} — {levelNameOf(t.level)}</option>
					{/each}
				</select>
			</div>
		{/if}

		{#if blocked}
			<div class='blocked' role='status'>
				<i class='fas fa-triangle-exclamation'></i>
				<span>{game.i18n?.format('obs-utils.applications.director.levelBlocked', { level: blocked })}</span>
			</div>
		{/if}
	</div>
{/if}

<style lang='stylus'>
	.levels-section
		display flex
		flex-direction column
		gap 8px

	// Stacked, not side by side: this panel lives in the Director's narrow
	// right-hand column and a label beside a select overflows it.
	.row
		display flex
		flex-direction column
		align-items stretch
		gap 2px

		select
			width 100%
			min-width 0

	.inline-label
		font-size 12px
		opacity 0.8

	.blocked
		display flex
		align-items center
		gap 6px
		padding 6px 8px
		border-radius 4px
		font-size 12px
		background rgba(255, 144, 0, 0.12)
		border 1px solid rgba(255, 144, 0, 0.4)
</style>
