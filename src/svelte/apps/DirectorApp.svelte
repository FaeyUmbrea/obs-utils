<svelte:options runes={true} />
<script lang='ts'>
	import { getApi, getGM } from '../../utils/helpers.ts';

	const isDisabled = getGM()?.active !== true;

	// Tabs come from the registry. Built-in tabs are pre-registered at module init;
	// other modules can register their own via api.registerDirectorTab().
	const tabs = $derived.by(() => {
		return Array.from(getApi().directorTabs.values())
			.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
	});

	// Seeded once the registry has tabs; also reseeded if the active tab vanishes
	// (e.g. a module unregisters — defensive, not common).
	let activeTabKey = $state<string>('');
	$effect(() => {
		if (tabs.length > 0 && !tabs.some(t => t.key === activeTabKey)) {
			activeTabKey = tabs[0].key;
		}
	});
</script>

<main>
	{#if isDisabled}
		<div class='warning'>
			<i class='fas fa-exclamation-triangle'></i>
			<span>{game.i18n?.localize('obs-utils.applications.director.noGMWarning')}</span>
		</div>
	{/if}

	<div class='tab-bar' role='tablist'>
		{#each tabs as tab (tab.key)}
			<button
				type='button'
				role='tab'
				class:active={activeTabKey === tab.key}
				aria-selected={activeTabKey === tab.key}
				onclick={() => (activeTabKey = tab.key)}
			>
				{#if tab.icon}<i class={tab.icon}></i>{/if}
				<span>{game.i18n?.localize(tab.label)}</span>
			</button>
		{/each}
	</div>

	<section class='tab-body'>
		{#each tabs as tab (tab.key)}
			{#if activeTabKey === tab.key}
				{@const Tab = tab.component}
				<Tab disabled={isDisabled} />
			{/if}
		{/each}
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
