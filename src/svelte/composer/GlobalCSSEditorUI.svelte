<svelte:options runes={true} />
<script lang='ts'>
	import type { SvelteApplication } from '../../applications/mixin.svelte.ts';
	import { settings } from '../../utils/settings.ts';

	const { foundryApp } = $props<{ foundryApp: SvelteApplication }>();
	const css = settings.getStore('globalOverlayCSS');

	let local = $state($css ?? '');

	function save() {
		$css = local;
	}

	async function saveAndClose() {
		save();
		await foundryApp.close();
	}

</script>

<div class='global-css'>
	<header class='intro'>
		<p>
			{game.i18n?.localize('obs-utils.applications.globalCSSEditor.intro')}
		</p>
	</header>

	<section class='editor'>
		<textarea
			bind:value={local}
			spellcheck='false'
			placeholder={'.obs-utils {\n  progress[value]::-webkit-progress-value {\n    background: linear-gradient(green, lime);\n  }\n}'}
		></textarea>
	</section>

	<footer>
		<button type='button' class='secondary' onclick={() => (local = '')}>
			{game.i18n?.localize('obs-utils.applications.styleEditor.clear')}
		</button>
		<div class='right'>
			<button type='button' onclick={() => foundryApp.close()}>
				{game.i18n?.localize('obs-utils.applications.overlayEditor.closeButton')}
			</button>
			<button type='button' class='primary' onclick={saveAndClose}>
				{game.i18n?.localize('obs-utils.applications.globalCSSEditor.saveButton')}
			</button>
		</div>
	</footer>
</div>

<style lang='stylus'>
	.global-css
		display flex
		flex-direction column
		height 100%
		padding 10px
		gap 10px

	.intro p
		margin 0
		font-size 12px
		opacity 0.8
		line-height 1.5

	.editor
		flex 1 1 auto
		min-height 0
		display flex

		textarea
			width 100%
			height 100%
			font-family ui-monospace, SFMono-Regular, Menlo, monospace
			font-size 12px
			line-height 1.5
			tab-size 2
			padding 10px
			background rgba(0, 0, 0, 0.25)
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 4px
			color #d4e1f5
			resize none
			white-space pre

			&:focus
				border-color rgba(255, 144, 0, 0.5)
				outline none

	footer
		display flex
		gap 8px
		align-items center
		flex 0 0 auto

		.right
			margin-left auto
			display flex
			gap 8px

		button
			height 32px
			padding 0 14px

		.primary
			background rgba(255, 144, 0, 0.25)
			border-color rgba(255, 144, 0, 0.6)

		.secondary
			background transparent
			opacity 0.7
</style>
