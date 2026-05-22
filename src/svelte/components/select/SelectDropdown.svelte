<svelte:options runes={true} />
<script lang='ts'>
	import type { SelectGroup, SelectItem } from './types';
	import { onMount } from 'svelte';
	import { portal } from './portal';

	let {
		groups,
		positionStyle,
		searchable,
		searchText = $bindable(''),
		highlightedIdx,
		flatItems,
		showCreate,
		createValue,
		isSelected,
		onSelect,
		onHover,
		onKeyDown,
		onBlur,
	}: {
		groups: SelectGroup[];
		positionStyle: string;
		searchable: boolean;
		searchText: string;
		highlightedIdx: number;
		flatItems: SelectItem[];
		showCreate: boolean;
		createValue: string;
		isSelected: (item: SelectItem) => boolean;
		onSelect: (item: SelectItem) => void;
		onHover: (idx: number) => void;
		onKeyDown: (e: KeyboardEvent) => void;
		onBlur: () => void;
	} = $props();

	// Pre-compute the cumulative offset per group so item index in the flat list
	// matches the parent's highlightedIdx without re-traversing each render.
	const groupOffsets = $derived.by(() => {
		const offsets: number[] = [];
		let acc = 0;
		for (const g of groups) {
			offsets.push(acc);
			acc += g.items.length;
		}
		return offsets;
	});

	const createIdx = $derived(flatItems.length - (showCreate ? 1 : 0));

	function onListMouseDown(e: MouseEvent) {
		e.preventDefault();
	}

	let searchInputEl = $state<HTMLInputElement | null>(null);
	onMount(() => {
		if (searchable) searchInputEl?.focus();
	});
</script>

<div use:portal class='ouselect-dropdown' style={positionStyle} role='listbox'>
	{#if searchable}
		<input
			type='text'
			class='ouselect-search'
			bind:this={searchInputEl}
			bind:value={searchText}
			onkeydown={onKeyDown}
			onblur={onBlur}
			placeholder=''
		/>
	{/if}
	<div class='ouselect-list' role='presentation' onmousedown={onListMouseDown}>
		{#each groups as group, gi (group.label || `__g${gi}__`)}
			{#if group.label}<div class='ouselect-group-label'>{group.label}</div>{/if}
			{#each group.items as item, i (item.value)}
				{@const idx = groupOffsets[gi] + i}
				<div
					class='ouselect-item'
					class:highlighted={idx === highlightedIdx}
					class:selected={isSelected(item)}
					onclick={() => onSelect(item)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							onSelect(item);
						}
					}}
					onmouseenter={() => onHover(idx)}
					role='option'
					aria-selected={isSelected(item)}
					tabindex='-1'
				>
					{#if item.icon}<i class={item.icon}></i>{/if}
					<span>{item.label}</span>
				</div>
			{/each}
		{/each}
		{#if showCreate}
			<div
				class='ouselect-item ouselect-create'
				class:highlighted={createIdx === highlightedIdx}
				onclick={() => onSelect({ value: createValue, label: createValue, $created: true })}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						onSelect({ value: createValue, label: createValue, $created: true });
					}
				}}
				onmouseenter={() => onHover(createIdx)}
				role='option'
				aria-selected={false}
				tabindex='-1'
			>
				<i class='fas fa-plus'></i>
				<span><strong>{createValue}</strong></span>
			</div>
		{/if}
		{#if flatItems.length === 0}
			<div class='ouselect-empty'>—</div>
		{/if}
	</div>
</div>

<style lang='stylus'>
	:global(.ouselect-dropdown)
		position: fixed
		background: var(--color-cool-5b, #1f1f1f)
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.2))
		border-radius: 4px
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5)
		z-index: 9999
		max-height: 320px
		display: flex
		flex-direction: column
		overflow: hidden
		color: var(--color-text-primary, inherit)
		font-size: var(--font-size-14, 14px)

	:global(.ouselect-search)
		border: 0
		border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.1))
		background: transparent
		color: inherit
		padding: 6px 8px
		outline: none
		font: inherit

	:global(.ouselect-list)
		overflow-y: auto
		flex: 1

	:global(.ouselect-group-label)
		padding: 4px 8px
		font-size: 0.75em
		text-transform: uppercase
		letter-spacing: 0.04em
		color: var(--color-text-secondary, rgba(255, 255, 255, 0.55))
		background: rgba(0, 0, 0, 0.25)
		user-select: none

	:global(.ouselect-item)
		padding: 6px 12px
		cursor: pointer
		display: flex
		align-items: center
		gap: 6px
		user-select: none

		&.highlighted
			background: var(--sidebar-entry-hover-bg, rgba(255, 255, 255, 0.08))

		&.selected
			font-weight: 600
			color: var(--color-text-accent, #c9a76b)

	:global(.ouselect-create)
		border-top: 1px solid var(--color-border, rgba(255, 255, 255, 0.1))
		font-style: italic

	:global(.ouselect-empty)
		padding: 8px 12px
		color: var(--color-text-secondary, rgba(255, 255, 255, 0.4))
		text-align: center
		font-style: italic
</style>
