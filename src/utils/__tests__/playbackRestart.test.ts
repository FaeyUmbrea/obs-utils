import type { OverlayFrame } from '../render.ts';
import type { OverlayData } from '../types.ts';
import { expect, it, vi } from 'vitest';
import { PlaybackEngine } from '../playback.ts';
import { TriggerRegistry } from '../triggers.ts';

it('restores one subscription per trigger when stopped playback is restarted', () => {
	vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
	vi.stubGlobal('cancelAnimationFrame', vi.fn());
	const registry = new TriggerRegistry();
	registry.register({ key: 'test', internal: true });
	const frames = new Map<string, OverlayFrame>();
	const changed = vi.fn();
	const engine = new PlaybackEngine(registry, frames, changed);
	const overlay = {
		id: 'restart',
		type: 'wysiwyg',
		style: '',
		config: {},
		components: [],
		animation: {
			initialTrackId: 'idle',
			tracks: ['idle', 'reaction'].map(id => ({ id, name: id, durationMs: 0, behavior: { type: 'static' }, lanes: [] })),
			transitions: [{ triggerKey: 'test', fromTrackId: 'idle', zones: [{ startT: 0, endT: 1, destination: { type: 'goto', toTrackId: 'reaction', toTime: 0 } }] }],
		},
	} as OverlayData;
	try {
		engine.mountTile(overlay, 'actor:a');
		engine.mountTile(overlay, 'actor:b');
		engine.start();
		engine.stop();
		expect(registry.list()[0].subscriberCount).toBe(0);
		engine.start();
		engine.start();
		expect(registry.list()[0].subscriberCount).toBe(1);
		changed.mockClear();
		registry.fire('test', { actor: { id: 'a' } });
		expect(frames.get('restart:actor:a')?.activeTrackId).toBe('reaction');
		expect(frames.get('restart:actor:b')?.activeTrackId).toBe('reaction');
		expect(changed).toHaveBeenCalledOnce();
	} finally {
		engine.stop();
		registry.destroy();
		vi.unstubAllGlobals();
	}
});
