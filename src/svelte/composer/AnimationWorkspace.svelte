<svelte:options runes={true} />
<script lang='ts'>
	import type { OverlayData, OverlayTrack, TrackBehavior } from '../../utils/types.ts';
	import { generateId } from '../../utils/types.ts';
	import { makeEmptyAnimation, makeEmptyTrack } from '../../utils/overlayAnimation.ts';

	const { layer, commit }: {
		layer: OverlayData;
		commit: () => void;
	} = $props();

	function ensureAnimation(): void {
		if (layer.animation) return;
		const initialId = generateId();
		layer.animation = makeEmptyAnimation(initialId);
		commit();
	}

	let selectedTrackId = $state<string | null>(layer.animation?.initialTrackId ?? null);
	const selectedTrack = $derived(
		selectedTrackId
			? layer.animation?.tracks.find(t => t.id === selectedTrackId) ?? null
			: null,
	);

	function addTrack() {
		ensureAnimation();
		const id = generateId();
		const track = makeEmptyTrack(id, defaultTrackName(layer.animation!.tracks.length + 1));
		track.behavior = { type: 'looping' };
		track.durationMs = 2000;
		layer.animation!.tracks = [...layer.animation!.tracks, track];
		selectedTrackId = id;
		commit();
	}

	function defaultTrackName(n: number): string {
		return `Track ${n}`;
	}

	function removeTrack(id: string) {
		if (!layer.animation) return;
		if (layer.animation.tracks.length <= 1) return;
		layer.animation.tracks = layer.animation.tracks.filter(t => t.id !== id);
		// Repoint references that touched the removed track.
		if (layer.animation.initialTrackId === id) {
			layer.animation.initialTrackId = layer.animation.tracks[0].id;
		}
		layer.animation.transitions = layer.animation.transitions
			.filter(tr => tr.fromTrackId !== id)
			.map(tr => ({
				...tr,
				zones: tr.zones.map(z =>
					z.destination.type === 'goto' && z.destination.toTrackId === id
						? { ...z, destination: { type: 'ignore' as const } }
						: z,
				),
			}));
		if (selectedTrackId === id) {
			selectedTrackId = layer.animation.tracks[0]?.id ?? null;
		}
		commit();
	}

	function renameTrack(track: OverlayTrack, name: string) {
		track.name = name;
		commit();
	}

	function setBehavior(track: OverlayTrack, type: TrackBehavior['type']) {
		if (type === 'static') track.behavior = { type: 'static' };
		else if (type === 'looping') track.behavior = { type: 'looping' };
		else {
			const fallbackId = layer.animation?.tracks.find(t => t.id !== track.id)?.id ?? track.id;
			track.behavior = { type: 'transition-on-end', toTrackId: fallbackId, toTime: 0 };
		}
		commit();
	}

	function setEndTransitionTarget(track: OverlayTrack, toTrackId: string) {
		if (track.behavior.type !== 'transition-on-end') return;
		track.behavior = { ...track.behavior, toTrackId };
		commit();
	}

	function setEndTransitionTime(track: OverlayTrack, toTime: number) {
		if (track.behavior.type !== 'transition-on-end') return;
		track.behavior = { ...track.behavior, toTime };
		commit();
	}

	function setDuration(track: OverlayTrack, ms: number) {
		track.durationMs = Math.max(0, ms);
		commit();
	}

	function setInitialTrack(id: string) {
		if (!layer.animation) return;
		layer.animation.initialTrackId = id;
		commit();
	}
</script>

<div class='anim-workspace'>
	{#if !layer.animation}
		<div class='no-anim'>
			<i class='fas fa-film'></i>
			<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.intro')}</p>
			<button type='button' class='primary-btn' onclick={ensureAnimation}>
				{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.start')}
			</button>
		</div>
	{:else}
		<aside class='tracks-pane'>
			<header class='pane-head'>
				<h3>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.tracks')}</h3>
				<button type='button' class='add-btn' onclick={addTrack} title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.addTrack')}>
					<i class='fas fa-plus'></i>
				</button>
			</header>
			<ul class='track-list'>
				{#each layer.animation.tracks as track (track.id)}
					<li
						class='track-row'
						class:selected={selectedTrackId === track.id}
					>
						<button
							type='button'
							class='track-pick'
							onclick={() => (selectedTrackId = track.id)}
						>
							{#if layer.animation.initialTrackId === track.id}
								<i class='fas fa-flag initial-flag' title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.initialTrack')}></i>
							{/if}
							<span class='track-name'>{track.name}</span>
							<span class='track-behavior'>{track.behavior.type}</span>
						</button>
						{#if layer.animation.tracks.length > 1}
							<button
								type='button'
								class='row-btn danger'
								title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.removeTrack')}
								onclick={() => removeTrack(track.id)}
							>
								<i class='fas fa-trash'></i>
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</aside>

		<section class='track-detail'>
			{#if selectedTrack}
				<header class='detail-head'>
					<input
						type='text'
						class='track-name-input'
						value={selectedTrack.name}
						onchange={e => renameTrack(selectedTrack, (e.currentTarget as HTMLInputElement).value)}
					/>
					<label class='initial-toggle'>
						<input
							type='radio'
							name='initial-track'
							checked={layer.animation.initialTrackId === selectedTrack.id}
							onchange={() => setInitialTrack(selectedTrack.id)}
						/>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.useAsInitial')}</span>
					</label>
				</header>

				<div class='detail-grid'>
					<label class='field'>
						<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behavior')}</span>
						<select
							value={selectedTrack.behavior.type}
							onchange={e => setBehavior(selectedTrack, (e.currentTarget as HTMLSelectElement).value as TrackBehavior['type'])}
						>
							<option value='static'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behaviorStatic')}</option>
							<option value='looping'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behaviorLooping')}</option>
							<option value='transition-on-end'>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.behaviorTransitionOnEnd')}</option>
						</select>
					</label>

					{#if selectedTrack.behavior.type !== 'static'}
						<label class='field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.duration')}</span>
							<input
								type='number'
								min='0'
								value={selectedTrack.durationMs}
								onchange={e => setDuration(selectedTrack, Number((e.currentTarget as HTMLInputElement).value) || 0)}
							/>
						</label>
					{/if}

					{#if selectedTrack.behavior.type === 'transition-on-end'}
						<label class='field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.endTarget')}</span>
							<select
								value={selectedTrack.behavior.toTrackId}
								onchange={e => setEndTransitionTarget(selectedTrack, (e.currentTarget as HTMLSelectElement).value)}
							>
								{#each layer.animation.tracks as t (t.id)}
									<option value={t.id}>{t.name}</option>
								{/each}
							</select>
						</label>
						<label class='field'>
							<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.endTargetTime')}</span>
							<input
								type='number'
								min='0'
								value={selectedTrack.behavior.toTime}
								onchange={e => setEndTransitionTime(selectedTrack, Number((e.currentTarget as HTMLInputElement).value) || 0)}
							/>
						</label>
					{/if}
				</div>

				<div class='lanes-placeholder'>
					<i class='fas fa-grip-lines'></i>
					<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.timelineComingSoon')}</p>
				</div>
			{:else}
				<div class='empty-detail'>
					<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.selectTrack')}</p>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style lang='stylus'>
	.anim-workspace
		display grid
		grid-template-columns 220px minmax(0, 1fr)
		gap 6px
		height calc(100% - 36px - 44px)
		padding 6px
		min-height 0

	.no-anim
		grid-column 1 / -1
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 12px
		opacity 0.7

		i
			font-size 36px
			opacity 0.5

		p
			margin 0
			font-size 13px
			max-width 320px
			text-align center
			line-height 1.5

		.primary-btn
			height 32px
			padding 0 16px
			background rgba(255, 144, 0, 0.18)
			border 1px solid rgba(255, 144, 0, 0.5)
			border-radius 4px
			cursor pointer
			font-size 13px

			&:hover
				background rgba(255, 144, 0, 0.28)

	.tracks-pane
		display flex
		flex-direction column
		min-height 0
		background rgba(0, 0, 0, 0.18)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow hidden

	.pane-head
		display flex
		align-items center
		justify-content space-between
		gap 6px
		padding 6px 8px
		border-bottom 1px solid rgba(255, 255, 255, 0.08)

		h3
			margin 0
			font-size 12px
			font-weight 600
			letter-spacing 0.4px
			text-transform uppercase
			opacity 0.7

		.add-btn
			width 24px
			height 22px
			background transparent
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			cursor pointer
			opacity 0.8

			&:hover
				opacity 1
				background rgba(255, 144, 0, 0.18)
				border-color rgba(255, 144, 0, 0.4)

	.track-list
		flex 1 1 auto
		list-style none
		margin 0
		padding 4px
		overflow-y auto
		display flex
		flex-direction column
		gap 2px

	.track-row
		display flex
		align-items center
		gap 2px
		border-radius 3px

		&.selected
			background rgba(255, 144, 0, 0.18)

	.track-pick
		flex 1 1 auto
		display flex
		align-items center
		gap 6px
		padding 6px 8px
		background transparent
		border 0
		color inherit
		text-align left
		font-size 12px
		cursor pointer
		min-width 0

		.initial-flag
			font-size 10px
			color #ffce80

		.track-name
			flex 1 1 auto
			overflow hidden
			text-overflow ellipsis
			white-space nowrap

		.track-behavior
			font-size 10px
			padding 1px 5px
			background rgba(255, 255, 255, 0.08)
			border-radius 3px
			opacity 0.65

	.row-btn
		width 26px
		height 22px
		background transparent
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		cursor pointer
		opacity 0.65
		margin-right 4px

		&:hover
			opacity 1

		&.danger:hover
			background rgba(220, 60, 60, 0.18)
			border-color rgba(220, 60, 60, 0.45)

	.track-detail
		display flex
		flex-direction column
		min-height 0
		background rgba(0, 0, 0, 0.18)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 10px
		gap 10px
		overflow-y auto

	.detail-head
		display flex
		align-items center
		gap 12px
		flex-wrap wrap

		.track-name-input
			flex 1 1 auto
			min-width 0
			height 30px
			padding 0 8px
			font-size 14px
			font-weight 600
			background rgba(0, 0, 0, 0.25)
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			color inherit

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.5)

	.initial-toggle
		display inline-flex
		align-items center
		gap 6px
		font-size 11px
		opacity 0.85

		input
			margin 0

	.detail-grid
		display grid
		grid-template-columns repeat(auto-fit, minmax(160px, 1fr))
		gap 8px

	.field
		display flex
		flex-direction column
		gap 4px
		font-size 11px

		span
			opacity 0.7

		input, select
			height 28px
			padding 0 6px
			font-size 12px
			background rgba(0, 0, 0, 0.25)
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			color inherit

	.lanes-placeholder
		margin-top 12px
		padding 24px
		display flex
		flex-direction column
		align-items center
		gap 8px
		border 1px dashed rgba(255, 255, 255, 0.1)
		border-radius 4px
		opacity 0.5

		i
			font-size 24px

		p
			margin 0
			font-size 12px

	.empty-detail
		padding 24px
		text-align center
		font-size 12px
		opacity 0.6
</style>
