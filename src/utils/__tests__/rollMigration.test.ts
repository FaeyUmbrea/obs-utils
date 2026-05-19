import type { OverlayData } from '../types.ts';
import { describe, expect, it } from 'vitest';
import { convertRollToWysiwyg } from '../rollMigration.ts';

function makeRollOverlay(config: Record<string, any> = {}, overrides: Partial<OverlayData> = {}): OverlayData {
	return {
		id: 'test-roll-id',
		type: 'roll',
		name: 'My Roll Overlay',
		enabled: true,
		components: [],
		style: '',
		config,
		...overrides,
	} as OverlayData;
}

describe('convertRollToWysiwyg', () => {
	it('produces a wysiwyg overlay with core.onPlayerRoll trigger', () => {
		const result = convertRollToWysiwyg(makeRollOverlay());
		expect(result.type).toBe('wysiwyg');
		expect(result.trigger?.eventKey).toBe('core.onPlayerRoll');
		expect(result.trigger?.transition).toBe('fade');
	});

	it('preserves id, name, and enabled from the source', () => {
		const result = convertRollToWysiwyg(makeRollOverlay({}, { id: 'abc', name: 'Test', enabled: false }));
		expect(result.id).toBe('abc');
		expect(result.name).toBe('Test');
		expect(result.enabled).toBe(false);
	});

	it('sums preRollStay + rollStay + postRollStay into trigger.duration', () => {
		const result = convertRollToWysiwyg(makeRollOverlay({
			preRollStay: 1000,
			rollStay: 3000,
			postRollStay: 500,
		}));
		expect(result.trigger?.duration).toBe(4500);
	});

	it('uses rollFadeIn and rollFadeOut for showMs / hideMs', () => {
		const result = convertRollToWysiwyg(makeRollOverlay({ rollFadeIn: 400, rollFadeOut: 600 }));
		expect(result.trigger?.showMs).toBe(400);
		expect(result.trigger?.hideMs).toBe(600);
	});

	it('defaults duration to 5000 when no timing config present', () => {
		const result = convertRollToWysiwyg(makeRollOverlay());
		// preRollStay 0 + rollStay 5000 + postRollStay 0
		expect(result.trigger?.duration).toBe(5000);
	});

	it('defaults showMs and hideMs to 200 when not set', () => {
		const result = convertRollToWysiwyg(makeRollOverlay());
		expect(result.trigger?.showMs).toBe(200);
		expect(result.trigger?.hideMs).toBe(200);
	});

	it('includes rollBackground image component when set', () => {
		const result = convertRollToWysiwyg(makeRollOverlay({ rollBackground: 'path/to/bg.png' }));
		const imgComp = result.components.find(c => c.type === 'img' && c.data === 'path/to/bg.png');
		expect(imgComp).toBeDefined();
	});

	it('includes rollForeground image component when set', () => {
		const result = convertRollToWysiwyg(makeRollOverlay({ rollForeground: 'path/to/fg.png' }));
		const imgComp = result.components.find(c => c.type === 'img' && c.data === 'path/to/fg.png');
		expect(imgComp).toBeDefined();
	});

	it('always includes a trigger.total text component', () => {
		const result = convertRollToWysiwyg(makeRollOverlay());
		const textComp = result.components.find(c => c.type === 'pt' && c.data === 'trigger.total');
		expect(textComp).toBeDefined();
	});

	it('omits image components when rollBackground and rollForeground are absent', () => {
		const result = convertRollToWysiwyg(makeRollOverlay());
		const imgComps = result.components.filter(c => c.type === 'img');
		expect(imgComps).toHaveLength(0);
		expect(result.components).toHaveLength(1);
	});

	it('sets canvas size to 1920x1080', () => {
		const result = convertRollToWysiwyg(makeRollOverlay());
		expect(result.config?.w).toBe(1920);
		expect(result.config?.h).toBe(1080);
	});

	it('non-roll overlays in an array are unchanged by a manual filter', () => {
		const wysiwyg: OverlayData = {
			id: 'wysiwyg-id',
			type: 'wysiwyg',
			name: 'Keep me',
			enabled: true,
			components: [],
			style: '',
			config: { w: 800, h: 600 },
		} as OverlayData;
		// Simulates the migration filter without calling runMigrations()
		const overlays = [wysiwyg];
		const result = overlays.map(o => o?.type === 'roll' ? convertRollToWysiwyg(o) : o);
		expect(result[0]).toBe(wysiwyg);
	});
});
