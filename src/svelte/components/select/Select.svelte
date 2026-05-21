<svelte:options runes={true} />
<script lang='ts'>
	import SelectDropdown from './SelectDropdown.svelte';
	import { normalizeGroups, type SelectGroup, type SelectItem } from './types';

	type SingleValue = string | null;
	type MultiValue = string[];

	let {
		options,
		value = $bindable(),
		multiple = false,
		creatable = false,
		searchable = true,
		placeholder = '',
		disabled = false,
	}: {
		options: SelectItem[] | SelectGroup[];
		value: SingleValue | MultiValue;
		multiple?: boolean;
		creatable?: boolean;
		searchable?: boolean;
		placeholder?: string;
		disabled?: boolean;
	} = $props();

	let open = $state(false);
	let searchText = $state('');
	let highlightedIdx = $state(0);
	let positionStyle = $state('');
	let triggerEl: HTMLElement | null = null;

	const baseGroups = $derived(normalizeGroups(options));

	// Filter visible groups by current search text.
	const filteredGroups = $derived.by(() => {
		const q = searchText.trim().toLowerCase();
		if (!q) return baseGroups;
		const out: SelectGroup[] = [];
		for (const g of baseGroups) {
			const items = g.items.filter(
				it => it.label.toLowerCase().includes(q) || it.value.toLowerCase().includes(q),
			);
			if (items.length > 0) out.push({ label: g.label, items });
		}
		return out;
	});

	const showCreate = $derived.by(() => {
		const q = searchText.trim();
		if (!creatable || !q) return false;
		return !baseGroups.flatMap(g => g.items).some(it => it.value === q);
	});

	const flatItems = $derived.by(() => {
		const arr = filteredGroups.flatMap(g => g.items);
		if (showCreate) arr.push({ value: searchText.trim(), label: searchText.trim(), $created: true });
		return arr;
	});

	const valueLabel = $derived.by(() => {
		if (multiple) return '';
		const v = value as SingleValue;
		if (v == null || v === '') return '';
		const found = baseGroups.flatMap(g => g.items).find(it => it.value === v);
		return found?.label ?? v;
	});

	const valueIcon = $derived.by(() => {
		if (multiple) return null;
		const v = value as SingleValue;
		if (v == null || v === '') return null;
		const found = baseGroups.flatMap(g => g.items).find(it => it.value === v);
		return found?.icon ?? null;
	});

	const valueChips = $derived.by(() => {
		if (!multiple) return [] as SelectItem[];
		const arr = Array.isArray(value) ? (value as MultiValue) : [];
		const all = baseGroups.flatMap(g => g.items);
		return arr.map(v => {
			const found = all.find(it => it.value === v);
			return found ?? { value: v, label: v };
		});
	});

	function isSelected(item: SelectItem): boolean {
		if (multiple) {
			const arr = Array.isArray(value) ? (value as MultiValue) : [];
			return arr.includes(item.value);
		}
		return (value as SingleValue) === item.value;
	}

	function selectItem(item: SelectItem) {
		if (multiple) {
			const arr = Array.isArray(value) ? [...(value as MultiValue)] : [];
			const idx = arr.indexOf(item.value);
			if (idx >= 0) arr.splice(idx, 1);
			else arr.push(item.value);
			value = arr;
			// Keep dropdown open in multi mode; reset highlight to top of filtered list.
			searchText = '';
			highlightedIdx = 0;
		} else {
			value = item.value;
			closeDropdown();
		}
	}

	function removeChip(v: string) {
		if (!Array.isArray(value)) return;
		value = (value as MultiValue).filter(x => x !== v);
	}

	function positionDropdown() {
		if (!triggerEl) return;
		const r = triggerEl.getBoundingClientRect();
		positionStyle = `top:${Math.round(r.bottom + 2)}px;left:${Math.round(r.left)}px;min-width:${Math.round(r.width)}px;`;
	}

	function openDropdown() {
		if (disabled || open) return;
		searchText = '';
		highlightedIdx = 0;
		positionDropdown();
		open = true;
	}

	function closeDropdown() {
		open = false;
		searchText = '';
	}

	function toggleDropdown() {
		if (open) closeDropdown();
		else openDropdown();
	}

	function onTriggerKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
			e.preventDefault();
			openDropdown();
		}
	}

	function onDropdownKeyDown(e: KeyboardEvent) {
		const n = flatItems.length;
		if (e.key === 'Escape') {
			e.preventDefault();
			closeDropdown();
			triggerEl?.focus();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (n > 0) highlightedIdx = (highlightedIdx + 1) % n;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (n > 0) highlightedIdx = (highlightedIdx - 1 + n) % n;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const item = flatItems[highlightedIdx];
			if (item) selectItem(item);
		} else if (e.key === 'Tab') {
			closeDropdown();
		}
	}

	function onWindowClick(e: MouseEvent) {
		if (!open) return;
		const t = e.target as Node | null;
		if (!t) return;
		if (triggerEl?.contains(t)) return;
		// Anything inside the portalled dropdown carries the .ouselect-dropdown class on its root.
		const dropdownRoot = (t as HTMLElement).closest?.('.ouselect-dropdown');
		if (dropdownRoot) return;
		closeDropdown();
	}

	function onScrollOrResize() {
		if (open) positionDropdown();
	}

	function onHover(idx: number) {
		highlightedIdx = idx;
	}

	function onSearchBlur() {
		// Defer so a click inside the dropdown can fire first.
		setTimeout(() => {
			if (!open) return;
			const active = document.activeElement;
			if (active && active.closest?.('.ouselect-dropdown')) return;
			closeDropdown();
		}, 100);
	}
</script>

<svelte:window onclick={onWindowClick} onresize={onScrollOrResize} onscroll={onScrollOrResize} />

<div class='ouselect' class:open class:disabled bind:this={triggerEl}>
	<button
		type='button'
		class='ouselect-trigger'
		onclick={toggleDropdown}
		onkeydown={onTriggerKeyDown}
		{disabled}
		aria-expanded={open}
		aria-haspopup='listbox'
	>
		{#if multiple}
			<span class='ouselect-chips'>
				{#each valueChips as chip (chip.value)}
					<span class='ouselect-chip'>
						<span class='ouselect-chip-label'>{chip.label}</span>
						<button
							type='button'
							class='ouselect-chip-x'
							onclick={e => {
								e.stopPropagation();
								removeChip(chip.value);
							}}
							aria-label='Remove'
						><i class='fas fa-times'></i></button>
					</span>
				{/each}
				{#if valueChips.length === 0}
					<span class='ouselect-placeholder'>{placeholder}</span>
				{/if}
			</span>
		{:else}
			<span class='ouselect-value' class:placeholder={!valueLabel}>
				{#if valueIcon}<i class={valueIcon}></i>{/if}
				{valueLabel || placeholder}
			</span>
		{/if}
		<i class='fas fa-caret-down ouselect-caret' class:open></i>
	</button>
</div>

{#if open}
	<SelectDropdown
		groups={filteredGroups}
		{positionStyle}
		{searchable}
		bind:searchText
		{highlightedIdx}
		{flatItems}
		{showCreate}
		createValue={searchText.trim()}
		{isSelected}
		onSelect={selectItem}
		{onHover}
		onKeyDown={onDropdownKeyDown}
		onBlur={onSearchBlur}
	/>
{/if}

<style lang='stylus'>
	.ouselect
		position: relative
		display: block
		width: 100%

	.ouselect-trigger
		width: 100%
		min-height: 35px
		display: flex
		align-items: center
		gap: 4px
		padding: 4px 8px
		background: var(--sidebar-background, var(--color-cool-5b, #1f1f1f))
		color: inherit
		border: 1px solid var(--color-border, rgba(255, 255, 255, 0.15))
		border-radius: 4px
		cursor: pointer
		font: inherit
		text-align: left

		&:hover:not(:disabled)
			border-color: var(--color-border-highlight, rgba(255, 255, 255, 0.3))

		&:disabled
			opacity: 0.5
			cursor: not-allowed

	.ouselect-value
		flex: 1
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

		&.placeholder
			color: var(--color-text-secondary, rgba(255, 255, 255, 0.4))

	.ouselect-placeholder
		flex: 1
		color: var(--color-text-secondary, rgba(255, 255, 255, 0.4))

	.ouselect-chips
		flex: 1
		display: flex
		flex-wrap: wrap
		gap: 4px
		min-height: 24px
		align-items: center

	.ouselect-chip
		background: var(--sidebar-entry-hover-bg, rgba(255, 255, 255, 0.1))
		border-radius: 12px
		padding: 2px 4px 2px 10px
		display: inline-flex
		align-items: center
		gap: 4px
		font-size: 0.85em

	.ouselect-chip-x
		background: none
		border: 0
		color: inherit
		cursor: pointer
		padding: 0 4px
		display: inline-flex
		align-items: center
		font-size: 0.85em

		&:hover
			color: var(--color-text-warning, #e88)

	.ouselect-caret
		flex-shrink: 0
		margin-left: auto
		transition: transform 120ms ease

		&.open
			transform: rotate(180deg)
</style>
