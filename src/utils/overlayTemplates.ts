import type { OverlayData } from './types.ts';
import { readStarterOverlays } from './defaultOverlays.ts';
import { generateId, OverlayComponentData, OverlayData as OverlayDataClass } from './types.ts';

export interface OverlayTemplate {
	key: string;
	label: string;
	description: string;
	icon: string;
	create: () => OverlayData;
}

function makeText(data: string, x: number, y: number, w: number, h: number, style = ''): OverlayComponentData {
	const c = new OverlayComponentData('pt', data, style);
	c.x = x;
	c.y = y;
	c.w = w;
	c.h = h;
	return c;
}

function makeProgressBar(data: string, x: number, y: number, w: number, h: number): OverlayComponentData {
	const c = new OverlayComponentData('pb', data, '');
	c.x = x;
	c.y = y;
	c.w = w;
	c.h = h;
	return c;
}

function makeFAIcon(data: string, x: number, y: number, w: number, h: number): OverlayComponentData {
	const c = new OverlayComponentData('fai', data, '');
	c.x = x;
	c.y = y;
	c.w = w;
	c.h = h;
	return c;
}

const BUILT_IN_TEMPLATES: OverlayTemplate[] = [
	{
		key: 'custom-inline',
		label: 'obs-utils.applications.overlayEditor.templates.customInline.label',
		description: 'obs-utils.applications.overlayEditor.templates.customInline.description',
		icon: 'fas fa-grip-lines',
		create: () => new OverlayDataClass('sl', [], '', {}, 'Untitled overlay'),
	},
	{
		key: 'custom-canvas',
		label: 'obs-utils.applications.overlayEditor.templates.customCanvas.label',
		description: 'obs-utils.applications.overlayEditor.templates.customCanvas.description',
		icon: 'fas fa-vector-square',
		create: () => new OverlayDataClass('wysiwyg', [], '', { w: 300, h: 300 }, 'Untitled overlay'),
	},
	{
		key: 'hp-bar',
		label: 'obs-utils.applications.overlayEditor.templates.hpBar.label',
		description: 'obs-utils.applications.overlayEditor.templates.hpBar.description',
		icon: 'fas fa-heart',
		create: () => {
			const o = new OverlayDataClass('sl', [], '', {}, 'HP Bar');
			o.components = [
				makeProgressBar('system.attributes.hp.value;system.attributes.hp.max', 0, 0, 200, 40),
			];
			return o;
		},
	},
	{
		key: 'name-plate',
		label: 'obs-utils.applications.overlayEditor.templates.namePlate.label',
		description: 'obs-utils.applications.overlayEditor.templates.namePlate.description',
		icon: 'fas fa-id-card',
		create: () => {
			const o = new OverlayDataClass('sl', [], '', {}, 'Name Plate');
			o.components = [
				makeText('name', 0, 0, 200, 40, 'font-weight:600;'),
			];
			return o;
		},
	},
	{
		key: 'status-row',
		label: 'obs-utils.applications.overlayEditor.templates.statusRow.label',
		description: 'obs-utils.applications.overlayEditor.templates.statusRow.description',
		icon: 'fas fa-bolt',
		create: () => {
			const o = new OverlayDataClass('sl', [], '', {}, 'Status Row');
			o.components = [
				makeFAIcon('fas fa-shield-alt', 0, 0, 32, 32),
				makeFAIcon('fas fa-bolt', 0, 0, 32, 32),
				makeFAIcon('fas fa-fire', 0, 0, 32, 32),
			];
			return o;
		},
	},
];

// Built-ins + custom blanks + whatever the active system module registered as starter overlays.
export function getOverlayTemplates(): OverlayTemplate[] {
	const starter = readStarterOverlays();
	const starterTemplates: OverlayTemplate[] = starter.map((ov, idx) => ({
		key: `starter:${ov.id ?? idx}`,
		label: ov.name?.trim() || `Starter ${idx + 1}`,
		description: 'obs-utils.applications.overlayEditor.templates.starter.description',
		icon: 'fas fa-bookmark',
		create: () => {
			// Fresh ids so the user's copy is decoupled from the registered starter.
			const fresh: OverlayData = JSON.parse(JSON.stringify(ov));
			fresh.id = generateId();
			for (const c of fresh.components ?? []) c.id = generateId();
			return fresh;
		},
	}));
	return [...BUILT_IN_TEMPLATES, ...starterTemplates];
}
