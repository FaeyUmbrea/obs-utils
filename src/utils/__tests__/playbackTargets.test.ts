import type { OverlayFrame } from '../render.ts';
import type { OverlayData } from '../types.ts';
import { expect, it } from 'vitest';
import { PlaybackEngine } from '../playback.ts';
import { TriggerRegistry } from '../triggers.ts';

it('routes targeted animations to their tile and keeps untargeted events global', () => {
	const frames = new Map<string, OverlayFrame>();
	const registry = new TriggerRegistry();
	registry.register({ key: 'test', internal: true });
	const engine = new PlaybackEngine(registry, frames, () => {});
	const overlay = {
		id: 'ribbon',
		type: 'wysiwyg',
		name: 'Ribbon',
		style: '',
		config: {},
		components: [],
		animation: {
			initialTrackId: 'idle',
			tracks: ['idle', 'reaction'].map(id => ({ id, name: id, durationMs: 0, behavior: { type: 'static' }, lanes: [] })),
			transitions: [{ triggerKey: 'test', fromTrackId: 'idle', zones: [{ startT: 0, endT: 1, destination: { type: 'goto', toTrackId: 'reaction', toTime: 0 } }] }],
		},
	} as OverlayData;
	for (const key of ['actor:a', 'actor:b', 'user:u', 'user:v', 'singleton']) engine.mountTile(overlay, key);
	registry.fire('test', { actor: { id: 'a' }, user: { id: 'u' } });
	expect(frames.get('ribbon:actor:a')?.activeTrackId).toBe('reaction');
	expect(frames.get('ribbon:actor:b')?.activeTrackId).toBe('idle');
	expect(frames.get('ribbon:user:u')?.activeTrackId).toBe('reaction');
	expect(frames.get('ribbon:user:v')?.activeTrackId).toBe('idle');
	expect(frames.get('ribbon:singleton')?.activeTrackId).toBe('reaction');
	registry.fire('test', { message: { speaker: { actor: 'other' }, user: { id: 'other' } } });
	expect(frames.get('ribbon:actor:b')?.activeTrackId).toBe('idle');
	expect(frames.get('ribbon:user:v')?.activeTrackId).toBe('idle');
	registry.fire('test', {});
	expect(frames.get('ribbon:actor:b')?.activeTrackId).toBe('reaction');
	expect(frames.get('ribbon:user:v')?.activeTrackId).toBe('reaction');
	engine.stop();
	registry.destroy();
});

it.each([
	{ user: 'u' },
	{ user: { id: 'u' } },
	{ message: { author: { id: 'u' } } },
	{ message: { author: 'u' } },
	{ message: { user: 'u' } },
])('routes user identity %j to only its own player tile and renders its roll', async (sender) => {
	const { buildRenderTree } = await import('../render.ts');
	const overlay = {
		id: 'roll',
		type: 'wysiwyg',
		tileBy: 'players',
		config: {},
		style: '',
		components: [{ id: 'total', type: 'pt', data: 'trigger.total', style: '' }],
		animation: {
			initialTrackId: 'idle',
			tracks: ['idle', 'reaction'].map(id => ({ id, name: id, durationMs: 0, behavior: { type: 'static' }, lanes: [] })),
			transitions: [{ triggerKey: 'core.onPlayerRoll', fromTrackId: 'idle', zones: [{ startT: 0, endT: 1, destination: { type: 'goto', toTrackId: 'reaction', toTime: 0 } }] }],
		},
	} as unknown as OverlayData;
	const frames = new Map<string, OverlayFrame>();
	const registry = new TriggerRegistry();
	registry.register({ key: 'core.onPlayerRoll', internal: true });
	const engine = new PlaybackEngine(registry, frames, () => {});
	for (const id of ['u', 'v', 'w']) engine.mountTile(overlay, `user:${id}`);
	try {
		const payload = { ...sender, total: 17 };
		registry.fire('core.onPlayerRoll', payload);
		expect([...frames.values()].map(frame => frame.activeTrackId)).toEqual(['reaction', 'idle', 'idle']);
		const tree = buildRenderTree([overlay], {
			actors: new Map(),
			users: new Map(),
			frames,
			triggerPayloads: new Map([['core.onPlayerRoll', payload]]),
		}, { userIds: ['u', 'v', 'w'] });
		expect(tree.overlays.map(tile => tile.components[0].values.value)).toEqual(['17', '', '']);
	} finally {
		engine.stop();
		registry.destroy();
	}
});
