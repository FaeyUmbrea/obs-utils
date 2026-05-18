<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData } from '../../utils/types.ts';
	import { settings } from '../../utils/settings.ts';
	import RollListenerComponent from './overlaycomponents/RollListenerComponent.svelte';

	const overlays = settings.getReadableStore<OverlayData[]>('streamOverlays');

	const players = (game as any).users.filter((e: any) => e.id !== (game as any).user.id).map((user: any) => ({ id: user.id, name: user.name }));

	// PlayerRollOverlay is a singleton renderer: it picks the first 'roll' layer
	// and uses its config. Additional roll layers are ignored.
	const rollEntry = $derived(($overlays ?? []).find(o => o?.type === 'roll'));
	const enabled = $derived(!rollEntry || rollEntry.enabled !== false);
	const config = $derived(rollEntry?.config ?? {});
</script>

{#if enabled}
	<div class='obs-utils roll-overlay'>
		{#each players as player (player.id)}
			<div class='roll-instance' data-player-name={player.name}>
				<RollListenerComponent id={player.id} {config} />
			</div>
		{/each}
	</div>
{/if}
