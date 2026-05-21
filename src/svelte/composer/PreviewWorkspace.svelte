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

	function fire(key: string) {
		getApi().fireOverlayTrigger(key, {});
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
