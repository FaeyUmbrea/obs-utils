<svelte:options runes={true} />
<script lang='ts'>
	import { getApi } from '../../utils/helpers.ts';
	import OverlayPreviewUI from '../OverlayPreviewUI.svelte';

	const triggers = $derived.by(() => {
		const out: Array<{ key: string; name: string; icon?: string }> = [];
		for (const [key, reg] of getApi().overlayTriggers) {
			const label = reg.name ? (game.i18n?.localize(reg.name) ?? reg.name) : key;
			out.push({ key, name: label, icon: reg.icon });
		}
		return out;
	});

	// Build a mock payload that exercises the most common fields a user would
	// reference. For the built-in triggers we synthesise realistic-looking data
	// (actor pulled from `overlayActors`, current user, a random 1d20 roll, etc.)
	// so previews render with values instead of blanks.
	function mockPayload(key: string): Record<string, unknown> {
		const overlayActors = (game as { settings?: { get: (m: string, k: string) => unknown } }).settings?.get('obs-utils', 'overlayActors') as string[] | undefined;
		const firstActorId = overlayActors?.[0];
		const actor = firstActorId
			? (game as { actors?: { get?: (id: string) => unknown } }).actors?.get?.(firstActorId)
			: undefined;
		const currentUser = (game as { user?: unknown }).user;
		if (key === 'core.onPlayerRoll') {
			const d20 = 1 + Math.floor(Math.random() * 20);
			return {
				actor,
				user: currentUser,
				roll: { total: d20, formula: '1d20' },
				total: d20,
				formula: '1d20',
				isCritical: d20 === 20,
				isFumble: d20 === 1,
			};
		}
		if (key === 'core.onChatMessage') {
			return {
				message: {
					content: 'Test chat message',
					speaker: { actor: firstActorId, alias: (actor as { name?: string } | undefined)?.name ?? 'Test' },
					user: currentUser,
				},
				actor,
				user: currentUser,
				content: 'Test chat message',
				speakerAlias: (actor as { name?: string } | undefined)?.name ?? 'Test',
			};
		}
		return {};
	}

	function fire(key: string) {
		getApi().fireOverlayTrigger(key, mockPayload(key));
	}
</script>

<div class='preview-workspace'>
	<aside class='fire-panel'>
		<h3>{game.i18n?.localize('obs-utils.applications.overlayEditor.preview.testFires')}</h3>
		<p class='hint'>{game.i18n?.localize('obs-utils.applications.overlayEditor.preview.testFiresHint')}</p>
		<ul class='trigger-list'>
			{#each triggers as t (t.key)}
				<li>
					<button type='button' class='fire-btn' onclick={() => fire(t.key)}>
						<i class={t.icon ?? 'fas fa-bolt'}></i>
						<span>{t.name}</span>
						<i class='fas fa-play play-cue'></i>
					</button>
				</li>
			{/each}
			{#if triggers.length === 0}
				<li class='empty'>{game.i18n?.localize('obs-utils.applications.overlayEditor.preview.noTriggers')}</li>
			{/if}
		</ul>
	</aside>
	<div class='preview-frame'>
		<OverlayPreviewUI />
	</div>
</div>

<style lang='stylus'>
	.preview-workspace
		display grid
		grid-template-columns 220px minmax(0, 1fr)
		gap 6px
		flex 1 1 auto
		padding 6px
		min-height 0
		overflow hidden

	.fire-panel
		display flex
		flex-direction column
		gap 8px
		padding 10px
		background rgba(0, 0, 0, 0.18)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow-y auto

		h3
			margin 0
			font-size 12px
			font-weight 600
			text-transform uppercase
			letter-spacing 0.4px
			opacity 0.7

		.hint
			margin 0
			font-size 11px
			opacity 0.6
			line-height 1.4

	.trigger-list
		list-style none
		margin 0
		padding 0
		display flex
		flex-direction column
		gap 4px

		.empty
			font-size 11px
			opacity 0.55
			font-style italic
			padding 8px 0

	.fire-btn
		display flex
		align-items center
		gap 8px
		width 100%
		padding 8px 10px
		background rgba(255, 144, 0, 0.1)
		border 1px solid rgba(255, 144, 0, 0.3)
		border-radius 4px
		cursor pointer
		font-size 12px
		text-align left

		&:hover
			background rgba(255, 144, 0, 0.2)
			border-color rgba(255, 144, 0, 0.5)

		span
			flex 1 1 auto

		.play-cue
			font-size 10px
			opacity 0.55

	.preview-frame
		min-width 0
		min-height 0
		background #1a1a1a
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden
</style>
