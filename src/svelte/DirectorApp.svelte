<svelte:options runes={true} />
<script lang='ts'>
	import { getGM } from '../utils/helpers.ts';
	import CoDMsTab from './components/director/CoDMsTab.svelte';
	import ControlsTab from './components/director/ControlsTab.svelte';
	import PresetsTab from './components/director/PresetsTab.svelte';

	const isDisabled = getGM()?.active !== true;

	type TabKey = 'controls' | 'presets' | 'codms';
	let activeTab = $state<TabKey>('controls');
</script>

<main>
	{#if isDisabled}
		<div class='warning'>
			<i class='fas fa-exclamation-triangle'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.noGMWarning')}</span>
		</div>
	{/if}

	<div class='tab-bar' role='tablist'>
		<button
			type='button'
			role='tab'
			class:active={activeTab === 'controls'}
			aria-selected={activeTab === 'controls'}
			onclick={() => (activeTab = 'controls')}
		>
			<i class='fas fa-video'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.tabControls')}</span>
		</button>
		<button
			type='button'
			role='tab'
			class:active={activeTab === 'presets'}
			aria-selected={activeTab === 'presets'}
			onclick={() => (activeTab = 'presets')}
		>
			<i class='fas fa-bookmark'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.tabPresets')}</span>
		</button>
		<button
			type='button'
			role='tab'
			class:active={activeTab === 'codms'}
			aria-selected={activeTab === 'codms'}
			onclick={() => (activeTab = 'codms')}
		>
			<i class='fas fa-users'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.tabCoDMs')}</span>
		</button>
	</div>

	<section class='tab-body'>
		{#if activeTab === 'controls'}
			<ControlsTab disabled={isDisabled} />
		{:else if activeTab === 'presets'}
			<PresetsTab />
		{:else if activeTab === 'codms'}
			<CoDMsTab />
		{/if}
	</section>
</main>

<style lang='stylus'>
	main
		display flex
		flex-direction column
		height 100%
		gap 8px

	.warning
		background-color #ffeb3b
		color #333
		padding 8px 10px
		border-radius 4px
		border 2px solid #ffc107
		display flex
		align-items center
		gap 8px
		font-weight bold
		font-size 12px

		i
			font-size 16px
			color #ff9800

	.tab-bar
		display flex
		gap 2px
		flex 0 0 auto
		border-bottom 1px solid rgba(255, 255, 255, 0.1)

		button
			flex 1 1 auto
			height 32px
			display flex
			align-items center
			justify-content center
			gap 6px
			background transparent
			border 1px solid transparent
			border-bottom none
			border-radius 4px 4px 0 0
			font-size 12px
			color inherit
			padding 0 10px

			i
				font-size 11px
				opacity 0.75

			&:hover
				background rgba(255, 255, 255, 0.05)

			&.active
				background rgba(255, 144, 0, 0.15)
				border-color rgba(255, 144, 0, 0.45)
				border-bottom-color transparent
				font-weight 600

	.tab-body
		flex 1 1 auto
		min-height 0
		overflow-y auto
		display flex
		flex-direction column
		gap 12px
		padding 4px 2px
</style>
