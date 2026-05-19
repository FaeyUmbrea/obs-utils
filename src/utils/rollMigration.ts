import type { OverlayData } from './types.ts';

function rid(): string {
	if (typeof globalThis !== 'undefined' && (globalThis as any).foundry?.utils?.randomID) {
		return (globalThis as any).foundry.utils.randomID();
	}
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function convertRollToWysiwyg(old: OverlayData): OverlayData {
	const c = old.config ?? {};
	const duration = (c.preRollStay ?? 0) + (c.rollStay ?? 5000) + (c.postRollStay ?? 0);
	const components: any[] = [];
	if (c.rollBackground) {
		components.push({
			id: rid(),
			type: 'img',
			data: c.rollBackground,
			style: '',
			customCSS: 'img { width: 100%; height: 100%; object-fit: contain; }',
			x: 760,
			y: 440,
			w: 400,
			h: 200,
		});
	}
	if (c.rollForeground) {
		components.push({
			id: rid(),
			type: 'img',
			data: c.rollForeground,
			style: '',
			customCSS: 'img { width: 100%; height: 100%; object-fit: contain; }',
			x: 760,
			y: 440,
			w: 400,
			h: 200,
		});
	}
	components.push({
		id: rid(),
		type: 'pt',
		data: 'trigger.total',
		style: '',
		customCSS: 'font-size: 96px; font-weight: 900; color: white; text-align: center; line-height: 200px; text-shadow: 0 0 24px black;',
		x: 760,
		y: 440,
		w: 400,
		h: 200,
	});
	return {
		id: old.id ?? rid(),
		type: 'wysiwyg',
		name: old.name ?? 'Migrated Roll Overlay',
		enabled: old.enabled ?? true,
		components,
		style: old.style ?? '',
		config: { w: 1920, h: 1080 },
		trigger: {
			eventKey: 'core.onPlayerRoll',
			conditions: {},
			duration,
			showMs: c.rollFadeIn ?? 200,
			hideMs: c.rollFadeOut ?? 200,
			transition: 'fade',
		},
	} as OverlayData;
}
