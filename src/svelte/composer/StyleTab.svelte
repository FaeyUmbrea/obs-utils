<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayComponentData, OverlayData } from '../../utils/types.ts';
	import EasyStyleFields from './EasyStyleFields.svelte';

	let {
		target,
		commit,
	} = $props<{
		target: OverlayData | OverlayComponentData | null;
		commit: () => void;
	}>();

	let mode = $state<'easy' | 'advanced'>('easy');

	const targetIsComponent = $derived(target ? 'data' in (target as any) && (target as any).data !== undefined && !('components' in (target as any)) : false);
	const targetLabel = $derived(target == null ? '' : (targetIsComponent ? 'Component' : 'Overlay'));

	function getInlineStyle(): string {
		return target?.style ?? '';
	}
	function setInlineStyle(v: string) {
		if (!target) return;
		target.style = v;
		commit?.();
	}

	function getCustomCSS(): string {
		return target?.customCSS ?? '';
	}
	function setCustomCSS(v: string) {
		if (!target) return;
		target.customCSS = v;
		commit?.();
	}

	function t(key: string, fallback: string) {
		return game.i18n?.localize(key) || fallback;
	}
</script>

<div class='style-tab'>
	{#if !target}
		<div class='hint'>{t('obs-utils.applications.overlayEditor.styleNoTarget', 'Select a component or overlay to style it.')}</div>
	{:else}
		<header class='target-bar'>
			<span class='target-name'>
				<i class='fas fa-paint-brush'></i>
				{t('obs-utils.applications.overlayEditor.stylingTarget', 'Styling')}: <strong>{targetLabel}</strong>
			</span>
			<div class='mode-pill' role='tablist'>
				<button
					type='button'
					role='tab'
					aria-selected={mode === 'easy'}
					class:active={mode === 'easy'}
					onclick={() => (mode = 'easy')}
				>{t('obs-utils.applications.styleEditor.mode.simple', 'Easy')}</button>
				<button
					type='button'
					role='tab'
					aria-selected={mode === 'advanced'}
					class:active={mode === 'advanced'}
					onclick={() => (mode = 'advanced')}
				>{t('obs-utils.applications.styleEditor.mode.advanced', 'Advanced')}</button>
			</div>
		</header>

		{#if mode === 'easy'}
			<section class='mode-body easy'>
				<p class='mode-hint'>
					{t('obs-utils.applications.overlayEditor.easyHint', 'Quick visual tweaks. These apply as inline CSS to the element.')}
				</p>
				<EasyStyleFields bind:value={() => getInlineStyle(), v => setInlineStyle(v)} />
			</section>
		{:else}
			<section class='mode-body advanced'>
				<p class='mode-hint'>
					{t('obs-utils.applications.overlayEditor.advancedHint', 'Full CSS with selectors, pseudo-elements, nesting. Rules are auto-scoped to this target.')}
				</p>
				<textarea
					class='css-editor'
					spellcheck='false'
					placeholder={'progress {\n  width: 200px;\n  &::-webkit-progress-value {\n    background: linear-gradient(green, lime);\n  }\n}'}
					value={getCustomCSS()}
					oninput={(e) => setCustomCSS((e.currentTarget as HTMLTextAreaElement).value)}
				></textarea>
			</section>
		{/if}
	{/if}
</div>

<style lang='stylus'>
	.style-tab
		display flex
		flex-direction column
		flex 1 1 auto
		height 100%
		min-height 0

	.hint
		flex 1 1 auto
		display flex
		align-items center
		justify-content center
		opacity 0.5
		font-size 12px
		padding 24px
		text-align center

	.target-bar
		display flex
		align-items center
		justify-content space-between
		gap 6px
		padding 6px 0
		flex 0 0 auto

		.target-name
			font-size 11px
			opacity 0.8
			display flex
			align-items center
			gap 6px

			i
				opacity 0.6

			strong
				font-weight 600

	.mode-pill
		display inline-flex
		background rgba(0, 0, 0, 0.2)
		border-radius 4px
		padding 2px
		gap 2px

		button
			background transparent
			border none
			padding 3px 10px
			font-size 11px
			color inherit
			border-radius 3px
			cursor pointer
			opacity 0.6

			&.active
				background rgba(255, 144, 0, 0.25)
				opacity 1
				font-weight 600

			&:hover:not(.active)
				opacity 0.85

	.mode-body
		flex 1 1 auto
		min-height 0
		overflow-y auto
		display flex
		flex-direction column

		&.advanced
			overflow hidden

	.mode-hint
		margin 0 0 8px 0
		font-size 11px
		opacity 0.6
		font-style italic

	.css-editor
		flex 1 1 auto
		min-height 200px
		width 100%
		font-family ui-monospace, SFMono-Regular, Menlo, monospace
		font-size 12px
		line-height 1.4
		tab-size 2
		padding 8px
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.1)
		border-radius 4px
		color #d4e1f5
		resize none
		white-space pre

		&:focus
			border-color rgba(255, 144, 0, 0.5)
			outline none
</style>
