<svelte:options runes={true} />
<script lang='ts'>
	import { TimelineDragController } from './timelineDrag.svelte.ts';

	interface Props {
		keyframes: import('../../../utils/cameraPresets.ts').CameraKeyframe[];
		totalMs: number;
		zoom: number;
		playheadMs: number;
		selectedIndices: number[];
		recording: boolean;
		recordStartTimelineMs: number;
		recordElapsedMs: number;
		onKeyframesChange: (next: import('../../../utils/cameraPresets.ts').CameraKeyframe[]) => void;
		onZoomChange: (next: number) => void;
	}
	let {
		keyframes,
		totalMs,
		zoom,
		playheadMs = $bindable(),
		selectedIndices = $bindable(),
		recording,
		recordStartTimelineMs,
		recordElapsedMs,
		onKeyframesChange,
		onZoomChange,
	}: Props = $props();

	function formatSeconds(ms: number): string {
		return `${(ms / 1000).toFixed(2)}s`;
	}

	let timelineWrapEl = $state<HTMLDivElement | null>(null);
	let timelineEl = $state<HTMLDivElement | null>(null);

	function stripWidth(): number {
		return timelineEl?.clientWidth ?? 600;
	}

	const drag = new TimelineDragController({
		getKeyframes: () => keyframes,
		getTotalMs: () => totalMs,
		getZoom: () => zoom,
		getPlayheadMs: () => playheadMs,
		setPlayheadMs: (v) => { playheadMs = v; },
		getSelectedIndices: () => selectedIndices,
		setSelectedIndices: (next) => { selectedIndices = next; },
		getStripWidth: stripWidth,
		getStripRect: () => timelineEl?.getBoundingClientRect() ?? null,
		onKeyframesChange: (...args) => onKeyframesChange(...args),
		onZoomChange: (...args) => onZoomChange(...args),
	});

	// Group keyframes only when their rounded screen-pixel positions match
	// exactly. Anything that resolves to even one pixel apart renders as a
	// distinct dot — overlap is fine, but pretending keyframes 50 ms apart
	// are "the same" was misleading.
	const stacks = $derived.by(() => {
		const out: Array<{ key: string; indices: number[]; t: number }> = [];
		let group: number[] = [];
		let groupPx = -1;
		let groupT = 0;
		for (let i = 0; i < keyframes.length; i++) {
			const px = Math.round(drag.tToX(keyframes[i].time));
			if (group.length === 0) {
				group = [i];
				groupPx = px;
				groupT = keyframes[i].time;
				continue;
			}
			if (px === groupPx) {
				group.push(i);
			} else {
				out.push({ key: `${groupT}-${group.length}`, indices: group, t: groupT });
				group = [i];
				groupPx = px;
				groupT = keyframes[i].time;
			}
		}
		if (group.length) out.push({ key: `${groupT}-${group.length}`, indices: group, t: groupT });
		return out;
	});

	const selectedIndex = $derived<number | null>(selectedIndices.length > 0 ? selectedIndices[0] : null);
</script>

<svelte:window onmousemove={e => drag.onWindowMouseMove(e)} onmouseup={() => drag.onWindowMouseUp()} />

<div
	class='ape-timeline-wrap'
	bind:this={timelineWrapEl}
	onwheel={e => drag.onWheel(e)}
>
	<div class='ape-timeline' bind:this={timelineEl} onmousedown={e => drag.onStripMouseDown(e)} role='presentation' style={`width: ${100 * zoom}%`}>
		<!-- tick grid: 6 labelled ticks keeps labels readable at narrow widths,
			with minor unlabeled ticks between them for visual rhythm. -->
		<div class='ticks'>
			{#each Array.from({ length: 11 }, (_, i) => i) as i (i)}
				<div class='tick' class:major={i % 2 === 0} class:tick-last={i === 10} style={`left: ${(i / 10) * 100}%`}>
					{#if i % 2 === 0}<span>{formatSeconds((i / 10) * totalMs)}</span>{/if}
				</div>
			{/each}
		</div>

		<!-- marker rail -->
		<div class='rail'>
			{#each stacks as g (g.key)}
				{#if g.indices.length === 1}
					{@const kf = keyframes[g.indices[0]]}
					<div
						class='kf-dot'
						class:selected={drag.isSelected(g.indices[0])}
						style={`left: ${drag.tToX(kf.time)}px`}
						role='button'
						tabindex='0'
						aria-label='Keyframe at {kf.time}ms'
						onmousedown={e => drag.startKfDrag(e, g.indices[0])}
						onclick={(e) => {
							e.stopPropagation();
							selectedIndices = [g.indices[0]];
							// Ctrl/Meta+click on the timeline yanks the playhead to the
							// keyframe — convenient when scrubbing to "go here, then play".
							if (e.ctrlKey || e.metaKey) playheadMs = keyframes[g.indices[0]].time;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								selectedIndices = [g.indices[0]];
							}
						}}
					></div>
				{:else}
					<div
						class='kf-stack'
						style={`left: ${drag.tToX(g.t)}px`}
						role='button'
						tabindex='0'
						aria-label='{g.indices.length} keyframes'
						onmousedown={(e) => {
							e.stopPropagation();
							e.preventDefault();
						}}
						onclick={(e) => {
							e.stopPropagation();
							// Cycle through stacked keyframes on plain click.
							const cur = selectedIndex !== null ? g.indices.indexOf(selectedIndex) : -1;
							const nextIdx = g.indices[(cur + 1) % g.indices.length];
							selectedIndices = [nextIdx];
							if (e.ctrlKey || e.metaKey) playheadMs = keyframes[nextIdx].time;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								const cur = selectedIndex !== null ? g.indices.indexOf(selectedIndex) : -1;
								const nextIdx = g.indices[(cur + 1) % g.indices.length];
								selectedIndices = [nextIdx];
							}
						}}
					>{g.indices.length}</div>
				{/if}
			{/each}
		</div>

		<!-- playhead line + handle -->
		{#if recording}
			{@const recStartX = drag.tToX(recordStartTimelineMs)}
			{@const recEndX = drag.tToX(Math.min(totalMs, recordStartTimelineMs + recordElapsedMs))}
			<div
				class='record-fill'
				style={`left: ${recStartX}px; width: ${Math.max(0, recEndX - recStartX)}px`}
				aria-hidden='true'
			></div>
		{/if}
		{#if drag.dragState?.kind === 'lasso'}
			{@const lassoLo = Math.min(drag.dragState.startMs, drag.dragState.endMs)}
			{@const lassoHi = Math.max(drag.dragState.startMs, drag.dragState.endMs)}
			<div
				class='lasso-fill'
				style={`left: ${drag.tToX(lassoLo)}px; width: ${Math.max(0, drag.tToX(lassoHi) - drag.tToX(lassoLo))}px`}
				aria-hidden='true'
			></div>
		{/if}
		<div class='playhead-line' style={`left: ${drag.tToX(playheadMs)}px`}></div>
		<div
			class='playhead-handle'
			style={`left: ${drag.tToX(playheadMs)}px`}
			role='button'
			tabindex='0'
			aria-label='Scrub playhead'
			onmousedown={e => drag.startPlayheadDrag(e)}
		></div>
	</div>
</div>

<style lang='stylus'>
	.ape-timeline-wrap
		position relative
		flex 0 0 auto
		background rgba(0, 0, 0, 0.25)
		border 1px solid rgba(255, 255, 255, 0.08)
		border-radius 4px
		overflow-x auto
		overflow-y hidden
		// Reserve a little horizontal padding so markers at t=0 / t=totalMs
		// don't get visually clipped by their negative left margin (-8px).
		padding 8px 12px

	.ape-timeline
		position relative
		height 90px
		cursor crosshair
		user-select none
		box-sizing border-box

	.ticks
		position absolute
		inset 0
		pointer-events none

	.tick
		position absolute
		top 0
		bottom 0
		width 1px
		background rgba(255, 255, 255, 0.05)

		&.major
			background rgba(255, 255, 255, 0.12)

		span
			position absolute
			top 0
			left 3px
			font-size 9px
			font-family monospace
			opacity 0.6
			white-space nowrap

		// Final tick (t=totalMs) — anchor its label to the LEFT of the line so
		// the timeline content never overhangs the right edge of the frame.
		&.tick-last span
			left auto
			right 3px

	.rail
		position absolute
		left 0
		right 0
		top 50%
		height 18px
		transform translateY(-50%)
		background rgba(255, 255, 255, 0.06)
		border-radius 3px

	.kf-dot
		position absolute
		top 1px
		width 16px
		height 16px
		margin-left -8px
		border-radius 50%
		background rgba(255, 144, 0, 0.85)
		border 1.5px solid rgba(255, 200, 80, 0.95)
		cursor grab

		&:active
			cursor grabbing

		&.selected
			background rgba(255, 200, 30, 1)
			border-color white
			border-width 2px
			box-shadow 0 0 0 3px rgba(255, 200, 30, 0.25)

	.kf-stack
		position absolute
		top -1px
		min-width 22px
		height 20px
		margin-left -11px
		padding 0 4px
		background rgba(255, 144, 0, 0.85)
		border 1.5px solid rgba(255, 200, 80, 0.95)
		border-radius 10px
		color white
		font-size 11px
		font-weight 600
		font-family monospace
		display inline-flex
		align-items center
		justify-content center
		cursor pointer

	.record-fill
		position absolute
		top 4px
		bottom 4px
		background linear-gradient(180deg, rgba(228, 70, 70, 0.18), rgba(228, 70, 70, 0.32))
		border-left 2px solid rgba(228, 70, 70, 0.6)
		border-right 1px dashed rgba(228, 70, 70, 0.45)
		pointer-events none

	// Lasso rectangle for ctrl+drag range selection. Cooler tone than the
	// record fill so the two overlays read as different operations.
	.lasso-fill
		position absolute
		top 4px
		bottom 4px
		background rgba(120, 180, 255, 0.18)
		border 1px dashed rgba(120, 180, 255, 0.65)
		pointer-events none

	.playhead-line
		position absolute
		top 4px
		bottom 4px
		width 2px
		margin-left -1px
		background rgba(255, 255, 255, 0.85)
		pointer-events none

	.playhead-handle
		position absolute
		top -2px
		width 14px
		height 14px
		margin-left -7px
		background white
		border 1.5px solid rgba(255, 200, 80, 0.95)
		border-radius 3px
		cursor grab

		&:active
			cursor grabbing
</style>
