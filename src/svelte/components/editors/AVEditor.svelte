<svelte:options runes={true} />
<script lang='ts'>
	import Select from '../select/Select.svelte';
	import { getActorValueGroups } from '../../../utils/helpers';

	let { data = $bindable('') } = $props<{ data: string }>();

	/**
	 * Heuristic guess at the user's intent: paths look like `actor.system.hp`
	 * or `trigger.actor.name`. Everything else is treated as static text.
	 * The user can override this with the toggle without losing their input —
	 * `data` is the same string either way.
	 */
	function looksLikePath(v: string): boolean {
		if (!v) return false;
		if (v.startsWith('trigger.')) return true;
		return v.includes('.') && /^[\w.]+$/.test(v);
	}

	let dataDriven = $state(looksLikePath(data ?? ''));
	const groups = getActorValueGroups();
</script>

<div class='av-editor'>
	<label class='mode-toggle'>
		<input type='checkbox' bind:checked={dataDriven} />
		<span>{game.i18n?.localize('obs-utils.applications.componentEditors.dataDriven') ?? 'Data-driven'}</span>
	</label>
	{#if dataDriven}
		<Select
			options={groups}
			bind:value={data}
			creatable={true}
			placeholder={game.i18n.localize('obs-utils.strings.avInputPlaceholder')}
		/>
	{:else}
		<input
			type='text'
			class='static-input'
			bind:value={data}
			placeholder={game.i18n?.localize('obs-utils.applications.componentEditors.staticPlaceholder') ?? ''}
		/>
	{/if}
</div>

<style lang='stylus'>
	.av-editor
		display flex
		flex-direction column
		gap 6px

	.mode-toggle
		display inline-flex
		align-items center
		gap 6px
		font-size 11px
		opacity 0.85

		input
			margin 0

	.static-input
		height 35px
		padding 0 8px
		font-size 13px
		background var(--sidebar-background, transparent)
		border 1px solid rgba(255, 255, 255, 0.15)
		border-radius 3px
		color inherit

		&:focus
			outline none
			border-color rgba(255, 144, 0, 0.6)
</style>
