export interface SelectItem {
	value: string;
	label: string;
	icon?: string;
	$created?: boolean;
}

export interface SelectGroup {
	label: string;
	items: SelectItem[];
}

export function isGrouped(options: SelectItem[] | SelectGroup[]): options is SelectGroup[] {
	return options.length > 0 && 'items' in (options[0] as { items?: unknown });
}

export function normalizeGroups(options: SelectItem[] | SelectGroup[]): SelectGroup[] {
	if (options.length === 0) return [];
	if (isGrouped(options)) return options;
	return [{ label: '', items: options }];
}
