<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData } from '../../utils/types.ts';
	import { settings } from '../../utils/settings.ts';
	import RollListenerComponent from './overlaycomponents/RollListenerComponent.svelte';

	const overlays = settings.getReadableStore<OverlayData[]>('streamOverlays');

	const players = (game as any).users
		.filter((e: any) => e.id !== (game as any).user.id)
		.map((user: any) => ({ id: user.id, name: user.name }));

	const enabled = $derived.by(() => {
		const entry = ($overlays ?? []).find(o => o?.type === 'roll');
		return !entry || entry.enabled !== false;
	});
</script>

{#if enabled}
	<div class='obs-utils roll-overlay'>
		{#each players as player (player.id)}
			<div class='roll-instance' data-player-name={player.name}>
				<RollListenerComponent id={player.id} />
			</div>
		{/each}
	</div>
{/if}
