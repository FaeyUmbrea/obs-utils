<svelte:options runes={true} />
<script lang='ts'>
	import { getContext } from 'svelte';

	const { value }: { value: string | null | undefined } = $props();

	// Trigger keys that the current overlay's animation transitions register.
	// Set by the composer when a layer is being edited; absent when the data
	// editor is rendered outside a layer context (in which case we can't warn
	// meaningfully, so the warning stays hidden).
	const activeTriggerKeys = getContext<Set<string> | undefined>('obs-utils.activeTriggerKeys');

	const triggerKeyInValue = $derived.by(() => {
		if (typeof value !== 'string') return null;
		if (!value.startsWith('trigger.')) return null;
		const rest = value.slice('trigger.'.length);
		const dot = rest.indexOf('.');
		const top = dot === -1 ? rest : rest.slice(0, dot);
		return top || null;
	});

	const showWarning = $derived.by(() => {
		if (!triggerKeyInValue) return false;
		if (!activeTriggerKeys) return false;
		return !activeTriggerKeys.has(triggerKeyInValue);
	});
</script>

{#if showWarning}
	<div class='trigger-warning' role='note'>
		<i class='fas fa-triangle-exclamation'></i>
		<span>
			{game.i18n?.localize('obs-utils.applications.componentEditors.triggerNotActive')}
			<strong>{triggerKeyInValue}</strong>.
		</span>
	</div>
{/if}

<style lang='stylus'>
	.trigger-warning
		display flex
		align-items flex-start
		gap 6px
		padding 6px 8px
		margin-top 4px
		font-size 11px
		background rgba(220, 160, 40, 0.12)
		border 1px solid rgba(220, 160, 40, 0.4)
		border-radius 3px
		color #f0d488

		i
			margin-top 1px
			font-size 11px
</style>
