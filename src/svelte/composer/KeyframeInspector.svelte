<svelte:options runes={true} />
<script lang='ts'>
	import type {
		AnimatablePropertyKey,
		EasingDirection,
		EasingEquation,
		EasingInterpolation,
		EasingV2,
		PropertyKeyframe,
		TrackKeyframe,
	} from '../../utils/overlayAnimation.ts';
	import type { OverlayComponentData, OverlayData, OverlayTrack, TrackComponentLane } from '../../utils/types.ts';
	import { getApi } from '../../utils/helpers.ts';
	import {
		DEFAULT_EASING_V2,
		EQUATION_LABELS,
		EQUATIONS,
		INTERP_LABELS,
		lanePropertyKeyframes,
		PROP_LABELS,
	} from '../../utils/overlayAnimation.ts';
	import { ensureComponentId } from '../../utils/types.ts';

	type Selection
		= | { kind: 'component'; componentId: string }
			| { kind: 'property'; componentId: string; prop: AnimatablePropertyKey }
			| { kind: 'legacy-kf'; componentId: string; index: number }
			| { kind: 'prop-kf'; componentId: string; prop: AnimatablePropertyKey; index: number };

	const USER_ANIMATABLE_PROPERTIES: AnimatablePropertyKey[] = ['opacity', 'x', 'y', 'rotation'];

	const {
		layer,
		track,
		playheadT,
		selection,
		selectedPropKfRef,
		selectedLegacyKfRef,
		valueAt,
		setPropertyValueAtPlayhead,
		togglePropertyKeyframe,
		patchPropKfTime,
		patchPropKfEasing,
		patchLegacyKfField,
		deleteLegacyKeyframe,
		onSelectProperty,
	}: {
		layer: OverlayData;
		track: OverlayTrack;
		playheadT: number;
		selection: Selection | null;
		selectedPropKfRef: { lane: TrackComponentLane; prop: AnimatablePropertyKey; kf: PropertyKeyframe; index: number } | null;
		selectedLegacyKfRef: { lane: TrackComponentLane; kf: TrackKeyframe; index: number } | null;
		valueAt: (componentId: string, prop: AnimatablePropertyKey) => number;
		setPropertyValueAtPlayhead: (componentId: string, prop: AnimatablePropertyKey, value: number) => void;
		togglePropertyKeyframe: (componentId: string, prop: AnimatablePropertyKey, currentValue: number) => void;
		patchPropKfTime: (t: number) => void;
		patchPropKfEasing: (patch: Partial<EasingV2>) => void;
		patchLegacyKfField: (field: keyof TrackKeyframe, value: number) => void;
		deleteLegacyKeyframe: () => void;
		onSelectProperty: (sel: Selection) => void;
	} = $props();

	const activeComponentId = $derived.by<string | null>(() => {
		if (selection?.kind === 'component') return selection.componentId;
		if (selection?.kind === 'property') return selection.componentId;
		if (selectedPropKfRef) return selectedPropKfRef.lane.componentId;
		if (selectedLegacyKfRef) return selectedLegacyKfRef.lane.componentId;
		return null;
	});

	function componentLabel(c: OverlayComponentData): string {
		const entry = getApi().overlayTypes.get(layer.type);
		const nameKey = entry?.overlayComponentNames?.get(c.type);
		const typeLabel = nameKey ? (game.i18n?.localize(nameKey) ?? c.type) : c.type;
		return `${typeLabel} #${(layer.components ?? []).indexOf(c) + 1}`;
	}

</script>

<div class='kf-inspector'>
	{#if activeComponentId}
		{@const compId = activeComponentId}
		{@const comp = (layer.components ?? []).find(c => ensureComponentId(c) === compId)}
		{@const lane = track.lanes.find(l => l.componentId === compId)}
		{#if comp}
			<header class='kf-detail-head'>
				<i class='fas fa-layer-group' style:font-size='10px' style:opacity='0.8'></i>
				<span>{componentLabel(comp)}</span>
			</header>
			<div class='prop-chevron-list'>
				{#each USER_ANIMATABLE_PROPERTIES as prop}
					{@const pkf = lane ? (lanePropertyKeyframes(lane)[prop] ?? []) : []}
					{@const onKf = pkf.some(k => k.t === Math.round(playheadT))}
					{@const hasTrack = pkf.length > 0}
					{@const curVal = valueAt(compId, prop)}
					{@const isOpacity = prop === 'opacity'}
					{@const displayVal = isOpacity ? Math.round(curVal * 100) : Number(curVal.toFixed(2))}
					{@const isExpanded = selectedPropKfRef?.prop === prop && selection?.kind === 'prop-kf' && selection.componentId === compId}
					{@const easing = isExpanded && selectedPropKfRef ? (selectedPropKfRef.kf.easing ?? DEFAULT_EASING_V2) : null}
					<div
						class='prop-value-row'
						class:expanded={isExpanded}
						class:selected={selection?.kind === 'property' && selection.componentId === compId && selection.prop === prop}
						onclick={(e) => {
							if ((e.target as HTMLElement).closest('input, button')) return;
							onSelectProperty({ kind: 'property', componentId: compId, prop });
						}}
						role='button'
						tabindex='0'
					>
						<span class='prop-label'>{PROP_LABELS[prop]}</span>
						<input
							class='prop-value-input'
							type='number'
							step='1'
							min={isOpacity ? 0 : undefined}
							max={isOpacity ? 100 : undefined}
							value={displayVal}
							onchange={(e) => {
								const raw = Number((e.currentTarget as HTMLInputElement).value);
								const stored = isOpacity ? raw / 100 : raw;
								setPropertyValueAtPlayhead(compId, prop, stored);
							}}
						/>
						{#if isOpacity}<span class='prop-unit'>%</span>{/if}
						<button
							type='button'
							class='kf-chevron-btn'
							class:state-none={!hasTrack}
							class:state-between={hasTrack && !onKf}
							class:state-on={onKf}
							title={onKf
								? 'Remove keyframe at playhead'
								: hasTrack
								? 'Add keyframe at playhead with current value'
								: 'Create property track + add keyframe at playhead'}
							onclick={() => togglePropertyKeyframe(compId, prop, curVal)}
						>
							<i class='fas fa-diamond'></i>
						</button>
					</div>

					{#if isExpanded && easing && selectedPropKfRef}
						<div class='prop-kf-expansion'>
							<div class='prop-kf-row'>
								<span class='kf-row-label'>Time</span>
								<input
									type='number'
									min='0'
									max={track.durationMs}
									value={selectedPropKfRef.kf.t}
									onchange={e => patchPropKfTime(Number((e.currentTarget as HTMLInputElement).value) || 0)}
								/>
								<span class='kf-row-unit'>ms</span>
							</div>
							<div class='prop-kf-row interp-row'>
								{#each (['constant', 'linear', 'bezier'] as EasingInterpolation[]) as mode}
									<button
										type='button'
										class='interp-chip'
										class:active={easing.interpolation === mode}
										onclick={() => patchPropKfEasing({ interpolation: mode })}
									>{INTERP_LABELS[mode]}</button>
								{/each}
							</div>
							{#if easing.interpolation === 'bezier'}
								<div class='prop-kf-row'>
									<select
										class='eq-select'
										value={easing.equation ?? 'sinusoidal'}
										onchange={e => patchPropKfEasing({ equation: (e.currentTarget as HTMLSelectElement).value as EasingEquation })}
									>
										{#each EQUATIONS as eq}
											<option value={eq}>{EQUATION_LABELS[eq]}</option>
										{/each}
									</select>
								</div>
								<div class='prop-kf-row dir-row'>
									{#each (['in', 'out', 'inout', 'auto'] as EasingDirection[]) as dir}
										<button
											type='button'
											class='dir-chip'
											class:active={easing.direction === dir}
											onclick={() => patchPropKfEasing({ direction: dir })}
										>{dir === 'inout' ? 'In/Out' : dir.charAt(0).toUpperCase() + dir.slice(1)}</button>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	{/if}
	{#if selectedLegacyKfRef}
		<header class='kf-detail-head'>
			<i class='fas fa-circle' style:font-size='8px' style:color='rgba(255,200,30,0.9)'></i>
			<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.keyframe')} t={selectedLegacyKfRef.kf.t}ms</span>
			<button type='button' class='row-btn danger' title={game.i18n?.localize('obs-utils.applications.overlayEditor.animation.deleteKeyframe')} onclick={deleteLegacyKeyframe}>
				<i class='fas fa-trash'></i>
			</button>
		</header>
		<div class='kf-grid'>
			<label class='field'>
				<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.time')}</span>
				<input type='number' min='0' max={track.durationMs} value={selectedLegacyKfRef.kf.t} onchange={e => patchLegacyKfField('t', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
			</label>
			<label class='field'>
				<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.opacity')}</span>
				<input type='number' min='0' max='1' step='0.05' value={selectedLegacyKfRef.kf.opacity ?? 1} onchange={e => patchLegacyKfField('opacity', Number((e.currentTarget as HTMLInputElement).value))} />
			</label>
			<label class='field'>
				<span>X</span>
				<input type='number' value={selectedLegacyKfRef.kf.x ?? 0} onchange={e => patchLegacyKfField('x', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
			</label>
			<label class='field'>
				<span>Y</span>
				<input type='number' value={selectedLegacyKfRef.kf.y ?? 0} onchange={e => patchLegacyKfField('y', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
			</label>
			<label class='field'>
				<span>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.rotation')}</span>
				<input type='number' value={selectedLegacyKfRef.kf.rotation ?? 0} onchange={e => patchLegacyKfField('rotation', Number((e.currentTarget as HTMLInputElement).value) || 0)} />
			</label>
			<label class='field'>
				<span>Scale X</span>
				<input type='number' step='0.05' value={selectedLegacyKfRef.kf.scaleX ?? 1} onchange={e => patchLegacyKfField('scaleX', Number((e.currentTarget as HTMLInputElement).value) || 1)} />
			</label>
			<label class='field'>
				<span>Scale Y</span>
				<input type='number' step='0.05' value={selectedLegacyKfRef.kf.scaleY ?? 1} onchange={e => patchLegacyKfField('scaleY', Number((e.currentTarget as HTMLInputElement).value) || 1)} />
			</label>
		</div>
	{/if}
	{#if !activeComponentId && !selectedPropKfRef && !selectedLegacyKfRef}
		<div class='kf-empty'>
			<i class='fas fa-mouse-pointer'></i>
			<p>{game.i18n?.localize('obs-utils.applications.overlayEditor.animation.kfSelectHint')}</p>
		</div>
	{/if}
</div>

<style lang='stylus'>
	.kf-inspector
		flex 1 1 auto
		min-height 0
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		padding 8px
		overflow-y auto

	.kf-empty
		display flex
		flex-direction column
		align-items center
		justify-content center
		gap 8px
		height 100%
		min-height 100px
		opacity 0.5
		font-size 12px

		i
			font-size 20px

	.prop-chevron-list
		display flex
		flex-direction column
		gap 4px
		margin-top 6px

	.prop-value-row
		display flex
		align-items center
		gap 6px
		height 24px
		padding 0 4px
		border-radius 3px

		&:hover
			background rgba(255, 255, 255, 0.04)

		.prop-label
			flex 0 0 70px
			font-size 11px
			font-family monospace
			opacity 0.8

		.prop-value-input
			flex 1 1 auto
			min-width 0
			height 22px
			padding 0 6px
			font-size 11px
			background rgba(0, 0, 0, 0.3)
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			color inherit
			font-family monospace

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.5)

		.prop-unit
			font-size 10px
			opacity 0.55
			margin-left -2px
			font-family monospace

		&.expanded
			background rgba(255, 144, 0, 0.08)
			border-radius 3px 3px 0 0

		&.selected:not(.expanded)
			background rgba(255, 200, 80, 0.06)

	.prop-kf-expansion
		display flex
		flex-direction column
		gap 4px
		padding 6px 4px 8px 78px
		background rgba(255, 144, 0, 0.06)
		border-left 2px solid rgba(255, 144, 0, 0.35)
		border-radius 0 0 3px 3px
		margin-bottom 4px

	.prop-kf-row
		display flex
		gap 4px
		align-items center

		input[type='number'], select
			height 22px
			padding 0 6px
			background rgba(0, 0, 0, 0.3)
			border 1px solid rgba(255, 255, 255, 0.12)
			border-radius 3px
			color inherit
			font-family monospace
			font-size 11px

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.5)

		input[type='number']
			width 70px

		.eq-select
			flex 1 1 auto
			font-family inherit

		.kf-row-label
			font-size 10px
			opacity 0.6
			font-family monospace

		.kf-row-unit
			font-size 10px
			opacity 0.5
			margin-left -2px

	.interp-row, .dir-row
		flex-wrap wrap

	.interp-chip, .dir-chip
		height 22px
		padding 0 8px
		font-size 11px
		background rgba(255, 255, 255, 0.05)
		border 1px solid rgba(255, 255, 255, 0.12)
		border-radius 3px
		cursor pointer
		color inherit
		text-transform capitalize

		&:hover
			background rgba(255, 255, 255, 0.1)

		&.active
			background rgba(255, 144, 0, 0.22)
			border-color rgba(255, 144, 0, 0.6)
			color #ffce80

	.dir-chip
		padding 0 6px
		font-size 10px

	.kf-chevron-btn
		width 18px
		height 18px
		padding 0
		background transparent
		border none
		cursor pointer
		display flex
		align-items center
		justify-content center

		i
			transition color 100ms ease, transform 100ms ease, text-shadow 100ms ease
			font-size 11px

		&.state-none i
			color rgba(255, 255, 255, 0.25)

		&.state-none:hover i
			color rgba(255, 255, 255, 0.6)

		&.state-between i
			color rgba(120, 180, 230, 0.75)

		&.state-between:hover i
			color rgba(160, 210, 250, 1)

		&.state-on i
			color rgba(255, 200, 80, 1)

		&:hover
			opacity 1 !important
			background rgba(255, 255, 255, 0.08)

	.kf-detail-head
		display flex
		align-items center
		gap 8px
		font-size 12px
		margin-bottom 6px

		.row-btn
			margin-left auto

	.row-btn
		width 26px
		height 22px
		background transparent
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 3px
		cursor pointer
		opacity 0.65

		&:hover
			opacity 1

		&.danger:hover
			background rgba(220, 60, 60, 0.18)
			border-color rgba(220, 60, 60, 0.45)

	.kf-grid
		display grid
		grid-template-columns repeat(auto-fit, minmax(110px, 1fr))
		gap 6px

	.field
		display flex
		flex-direction column
		gap 4px
		font-size 11px

		span
			opacity 0.7

		input
			height 28px
			padding 0 6px
			font-size 12px
			background rgba(0, 0, 0, 0.25)
			border 1px solid rgba(255, 255, 255, 0.1)
			border-radius 3px
			color #e4e4e4

			&:focus
				outline none
				border-color rgba(255, 144, 0, 0.5)
</style>
