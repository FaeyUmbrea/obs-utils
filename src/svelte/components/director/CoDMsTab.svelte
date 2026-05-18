<svelte:options runes={true} />
<script lang='ts'>
	import type { ReadyGame } from 'fvtt-types/configuration';
	import { getAllGMs } from '../../../utils/helpers.ts';
	import { settings } from '../../../utils/settings.ts';
	import { requestGMHandover } from '../../../utils/socket.ts';

	const activeGMUserId = settings.getStore('activeGMUserId');
	const allGMs = getAllGMs();
	const showCoDMs = allGMs.length > 1;
	const myUserId = (game as ReadyGame).user?.id ?? '';

	// Resolved "currently active GM" — honors the setting, falls back to first online GM.
	const activeGMId = $derived.by(() => {
		const wanted = $activeGMUserId;
		if (wanted) {
			const u = allGMs.find((g: any) => g.id === wanted);
			if (u && (u as any).active) return wanted;
		}
		return allGMs.find((g: any) => (g as any).active)?.id ?? '';
	});

	function takeControl(fromUserId: string) {
		requestGMHandover(fromUserId);
	}
</script>

{#if showCoDMs}
	<b>{game.i18n?.localize('obs-utils.applications.director.coDMsHeader')}</b>
	<ul class='codm-list'>
		{#each allGMs as gm (gm.id)}
			{@const isActive = gm.id === activeGMId}
			{@const isMe = gm.id === myUserId}
			{@const isOnline = !!gm.active}
			<li class='codm' class:active={isActive} class:offline={!isOnline} class:me={isMe}>
				<span class='status' class:online={isOnline} aria-hidden='true'></span>
				<span class='name' title={gm.name}>{gm.name}{isMe ? ' (you)' : ''}</span>
				{#if isActive}
					<span class='badge'>
						<i class='fas fa-star'></i>
						{game.i18n?.localize('obs-utils.applications.director.codmInControl')}
					</span>
				{:else if !isOnline}
					<span class='badge offline-tag'>{game.i18n?.localize('obs-utils.applications.director.codmOffline')}</span>
				{:else if isMe && (game as ReadyGame).user?.isGM && activeGMId}
					<button
						type='button'
						class='take-control'
						onclick={() => takeControl(activeGMId)}
						title={game.i18n?.localize('obs-utils.applications.director.takeControl')}
					>{game.i18n?.localize('obs-utils.applications.director.takeControl')}</button>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<div class='empty-codms'>
		<i class='fas fa-user-check'></i>
		<p>{game.i18n?.localize('obs-utils.applications.director.coDMsEmpty')}</p>
	</div>
{/if}

<style lang='stylus'>
	.codm-list
		list-style none
		margin 0
		padding 0
		display flex
		flex-direction column
		gap 4px

	.codm
		display grid
		grid-template-columns 10px 1fr auto
		gap 8px
		align-items center
		padding 4px 8px
		background rgba(255, 255, 255, 0.03)
		border 1px solid rgba(255, 255, 255, 0.07)
		border-radius 4px

		&.active
			background rgba(255, 144, 0, 0.12)
			border-color rgba(255, 144, 0, 0.4)

		&.offline
			opacity 0.55

		.status
			width 8px
			height 8px
			border-radius 50%
			background #666
			align-self center

			&.online
				background #4caf50
				box-shadow 0 0 4px rgba(76, 175, 80, 0.6)

		.name
			font-size 12px
			white-space nowrap
			overflow hidden
			text-overflow ellipsis

		.badge
			display inline-flex
			align-items center
			gap 4px
			font-size 10px
			text-transform uppercase
			letter-spacing 0.5px
			opacity 0.85

			i
				color #ff9000

			&.offline-tag
				opacity 0.6

		.take-control
			height 24px
			padding 0 10px
			font-size 11px
			background rgba(255, 144, 0, 0.18)
			border 1px solid rgba(255, 144, 0, 0.45)
			border-radius 3px
			cursor pointer

			&:hover
				background rgba(255, 144, 0, 0.3)
				border-color rgba(255, 144, 0, 0.7)

	.empty-codms
		display flex
		flex-direction column
		align-items center
		text-align center
		padding 20px
		gap 10px
		opacity 0.7

		i
			font-size 24px
			color #4caf50
			opacity 0.6

		p
			margin 0
			font-size 12px
			max-width 320px
			line-height 1.4
</style>
