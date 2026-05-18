<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayComponentData, OverlayData } from '../../utils/types.ts';
	import EasyStyleFields from './EasyStyleFields.svelte';

	let {
		target,
		hasComponent = false,
		targetKind = $bindable('component'),
		commit,
	} = $props<{
		target: OverlayData | OverlayComponentData | null;
		hasComponent?: boolean;
		targetKind?: 'layer' | 'component';
		commit: () => void;
	}>();

	let mode = $state<'easy' | 'advanced'>('easy');

	// One-shot migration when the editor focuses on a new target: anything
	// still sitting in the legacy inline `style` field gets folded into
	// `customCSS` so Simple/Advanced never disagree about what's there.
	$effect(() => {
		const t = target as any;
		if (!t || !t.style || !String(t.style).trim()) return;
		const legacy = String(t.style).trim();
		const existing = String(t.customCSS ?? '').trim();
		t.customCSS = existing ? `${legacy}\n${existing}` : legacy;
		t.style = '';
		commit?.();
	});

	function getCSS(): string {
		if (!target) return '';
		return (target as any).customCSS ?? '';
	}
	function setCSS(v: string) {
		if (!target) return;
		(target as any).customCSS = v;
		commit?.();
	}

	// `target` is either a layer (OverlayData) or a component (OverlayComponentData).
	// Image-related fields only make sense on image-rendering component types.
	const IMAGE_COMPONENT_TYPES = new Set(['img', 'bavimg', 'mimgav']);
	const showImage = $derived(
		targetKind === 'component' && target && IMAGE_COMPONENT_TYPES.has((target as any).type),
	);
</script>

<div class='style-tab'>
	{#if !target}
		<div class='hint'>{game.i18n?.localize('obs-utils.applications.overlayEditor.styleNoTarget')}</div>
	{:else}
		<header class='target-bar'>
			{#if hasComponent}
				<div class='mode-pill kind' role='tablist' aria-label={game.i18n?.localize('obs-utils.applications.overlayEditor.stylingTarget')}>
					<button
						type='button'
						role='tab'
						aria-selected={targetKind === 'layer'}
						class:active={targetKind === 'layer'}
						onclick={() => (targetKind = 'layer')}
					>{game.i18n?.localize('obs-utils.applications.overlayEditor.tabLayer')}</button>
					<button
						type='button'
						role='tab'
						aria-selected={targetKind === 'component'}
						class:active={targetKind === 'component'}
						onclick={() => (targetKind = 'component')}
					>{game.i18n?.localize('obs-utils.applications.overlayEditor.tabComponent')}</button>
				</div>
			{:else}
				<span class='target-name'>
					<i class='fas fa-paint-brush'></i>
					{game.i18n?.localize('obs-utils.applications.overlayEditor.stylingTarget')}: <strong>{game.i18n?.localize('obs-utils.applications.overlayEditor.tabLayer')}</strong>
				</span>
			{/if}
			<div class='mode-pill' role='tablist'>
				<button
					type='button'
					role='tab'
					aria-selected={mode === 'easy'}
					class:active={mode === 'easy'}
					onclick={() => (mode = 'easy')}
				>{game.i18n?.localize('obs-utils.applications.styleEditor.mode.simple')}</button>
				<button
					type='button'
					role='tab'
					aria-selected={mode === 'advanced'}
					class:active={mode === 'advanced'}
					onclick={() => (mode = 'advanced')}
				>{game.i18n?.localize('obs-utils.applications.styleEditor.mode.advanced')}</button>
			</div>
		</header>

		{#if mode === 'easy'}
			<section class='mode-body easy'>
				<p class='mode-hint'>
					{game.i18n?.localize('obs-utils.applications.overlayEditor.easyHint')}
				</p>
				<EasyStyleFields
					bind:value={() => getCSS(), v => setCSS(v)}
					showImage={showImage}
				/>
			</section>
		{:else}
			<section class='mode-body advanced'>
				<p class='mode-hint'>
					{game.i18n?.localize('obs-utils.applications.overlayEditor.advancedHint')}
				</p>
				<textarea
					class='css-editor'
					spellcheck='false'
					placeholder={'color: white;\nfont-size: 18px;\n\nprogress {\n  width: 200px;\n  &::-webkit-progress-value {\n    background: linear-gradient(green, lime);\n  }\n}'}
					value={getCSS()}
					oninput={e => setCSS((e.currentTarget as HTMLTextAreaElement).value)}
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
