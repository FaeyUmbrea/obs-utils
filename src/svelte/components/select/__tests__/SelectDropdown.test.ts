import { mount, unmount } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import SelectDropdown from '../SelectDropdown.svelte';

// portal appends to document.body — that's fine in jsdom.

function makeGroups(labels: string[]) {
	return [
		{ label: '', items: labels.map(l => ({ value: l, label: l })) },
	];
}

describe('selectDropdown.svelte', () => {
	it('renders all items from the groups', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(SelectDropdown, {
			target,
			props: {
				groups: makeGroups(['Alpha', 'Beta', 'Gamma']),
				positionStyle: '',
				searchable: false,
				searchText: '',
				highlightedIdx: -1,
				flatItems: [
					{ value: 'Alpha', label: 'Alpha' },
					{ value: 'Beta', label: 'Beta' },
					{ value: 'Gamma', label: 'Gamma' },
				],
				showCreate: false,
				createValue: '',
				isSelected: () => false,
				onSelect: vi.fn(),
				onHover: vi.fn(),
				onKeyDown: vi.fn(),
				onBlur: vi.fn(),
			},
		});

		// portal appends to body, so query document instead of target
		const items = document.querySelectorAll('.ouselect-item');
		expect(items.length).toBeGreaterThanOrEqual(3);

		unmount(instance);
	});

	it('clicking an item fires onSelect with that item', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const onSelect = vi.fn();
		const items = [
			{ value: 'foo', label: 'Foo' },
			{ value: 'bar', label: 'Bar' },
		];

		const instance = mount(SelectDropdown, {
			target,
			props: {
				groups: [{ label: '', items }],
				positionStyle: '',
				searchable: false,
				searchText: '',
				highlightedIdx: -1,
				flatItems: items,
				showCreate: false,
				createValue: '',
				isSelected: () => false,
				onSelect,
				onHover: vi.fn(),
				onKeyDown: vi.fn(),
				onBlur: vi.fn(),
			},
		});

		const renderedItems = document.querySelectorAll('.ouselect-item');
		(renderedItems[0] as HTMLElement).click();

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect.mock.calls[0][0].value).toBe('foo');

		unmount(instance);
	});

	it('highlighted item receives highlighted class', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const items = [
			{ value: 'x', label: 'X' },
			{ value: 'y', label: 'Y' },
		];

		const instance = mount(SelectDropdown, {
			target,
			props: {
				groups: [{ label: '', items }],
				positionStyle: '',
				searchable: false,
				searchText: '',
				highlightedIdx: 1,
				flatItems: items,
				showCreate: false,
				createValue: '',
				isSelected: () => false,
				onSelect: vi.fn(),
				onHover: vi.fn(),
				onKeyDown: vi.fn(),
				onBlur: vi.fn(),
			},
		});

		const renderedItems = document.querySelectorAll('.ouselect-item');
		expect(renderedItems[1].classList.contains('highlighted')).toBe(true);
		expect(renderedItems[0].classList.contains('highlighted')).toBe(false);

		unmount(instance);
	});

	it('selected items receive selected class via isSelected', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const items = [
			{ value: 'p', label: 'P' },
			{ value: 'q', label: 'Q' },
		];

		const instance = mount(SelectDropdown, {
			target,
			props: {
				groups: [{ label: '', items }],
				positionStyle: '',
				searchable: false,
				searchText: '',
				highlightedIdx: -1,
				flatItems: items,
				showCreate: false,
				createValue: '',
				isSelected: (item: any) => item.value === 'q',
				onSelect: vi.fn(),
				onHover: vi.fn(),
				onKeyDown: vi.fn(),
				onBlur: vi.fn(),
			},
		});

		const renderedItems = document.querySelectorAll('.ouselect-item');
		expect(renderedItems[1].classList.contains('selected')).toBe(true);
		expect(renderedItems[0].classList.contains('selected')).toBe(false);

		unmount(instance);
	});

	it('shows empty state when flatItems is empty', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(SelectDropdown, {
			target,
			props: {
				groups: [],
				positionStyle: '',
				searchable: false,
				searchText: '',
				highlightedIdx: -1,
				flatItems: [],
				showCreate: false,
				createValue: '',
				isSelected: () => false,
				onSelect: vi.fn(),
				onHover: vi.fn(),
				onKeyDown: vi.fn(),
				onBlur: vi.fn(),
			},
		});

		const empty = document.querySelector('.ouselect-empty');
		expect(empty).not.toBeNull();

		unmount(instance);
	});

	it('shows create option when showCreate=true', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(SelectDropdown, {
			target,
			props: {
				groups: [],
				positionStyle: '',
				searchable: false,
				searchText: '',
				highlightedIdx: -1,
				flatItems: [{ value: 'newval', label: 'newval', $created: true }],
				showCreate: true,
				createValue: 'newval',
				isSelected: () => false,
				onSelect: vi.fn(),
				onHover: vi.fn(),
				onKeyDown: vi.fn(),
				onBlur: vi.fn(),
			},
		});

		const createEl = document.querySelector('.ouselect-create');
		expect(createEl).not.toBeNull();

		unmount(instance);
	});

	it('renders search input when searchable=true', () => {
		document.body.innerHTML = '<div id="target"></div>';
		const target = document.getElementById('target')!;

		const instance = mount(SelectDropdown, {
			target,
			props: {
				groups: [],
				positionStyle: '',
				searchable: true,
				searchText: '',
				highlightedIdx: -1,
				flatItems: [],
				showCreate: false,
				createValue: '',
				isSelected: () => false,
				onSelect: vi.fn(),
				onHover: vi.fn(),
				onKeyDown: vi.fn(),
				onBlur: vi.fn(),
			},
		});

		const searchInput = document.querySelector('.ouselect-search');
		expect(searchInput).not.toBeNull();

		unmount(instance);
	});
});
