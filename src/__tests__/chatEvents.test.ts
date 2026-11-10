import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../utils/api.js', () => ({ ObsUtilsApi: class {}, registerDefaultTypes: vi.fn() }));
vi.mock('../utils/canvas.ts', () => ({ expandTokenHud: vi.fn(), isGM: vi.fn() }));
vi.mock('../utils/cssInjection.ts', () => ({ backfillIds: vi.fn() }));
vi.mock('../utils/directorState.ts', () => ({ initDirectorStateBridge: vi.fn() }));
vi.mock('../utils/helpers.js', () => ({ isManualOBS: vi.fn(), isOBS: vi.fn(), removeBG: vi.fn() }));
vi.mock('../utils/keybinds.ts', () => ({ registerKeybindings: vi.fn() }));
vi.mock('../utils/obs.ts', () => ({ initOBS: vi.fn() }));
vi.mock('../utils/settings.ts', () => ({ getSetting: vi.fn(), runMigrations: vi.fn(), setSetting: vi.fn() }));
vi.mock('../utils/settingsSetup.ts', () => ({ initOverlayDefaultsHooks: vi.fn(), initSettings: vi.fn() }));
vi.mock('../utils/socket.js', () => ({ activateViewportTracking: vi.fn(), deactivateViewportTracking: vi.fn(), onCanvasReadyEmit: vi.fn(), socketCanvas: vi.fn() }));
vi.mock('../utils/polyfill.ts', () => ({}));

afterEach(() => vi.unstubAllGlobals());

it.each(['game', 'stream'])('emits roll and chat events with the author on /%s without reading the removed user alias', async (view) => {
	vi.resetModules();
	const callbacks = new Map<string, (...args: any[]) => void>();
	vi.stubGlobal('Hooks', { once: vi.fn(), on: (key: string, callback: (...args: any[]) => void) => callbacks.set(key, callback) });
	const fireOverlayTrigger = vi.fn();
	const author = { id: 'player-1', name: 'Rolling Player' };
	const actor = { id: 'actor-1', name: 'Character' };
	vi.stubGlobal('game', {
		view,
		modules: { get: () => ({ api: { fireOverlayTrigger } }) },
		users: new Map([[author.id, author]]),
		actors: new Map([[actor.id, actor]]),
	});
	await import('../index.ts');
	await vi.waitFor(() => expect(callbacks.has('createChatMessage')).toBe(true));
	const roll = { total: 17, formula: '1d20 + 2', dice: [{ faces: 20, results: [{ result: 15 }] }] };
	const message = {
		author,
		get user(): never { throw new Error('Foundry V14 removed message.user'); },
		speaker: { actor: actor.id, alias: actor.name },
		whisper: [],
		isRoll: true,
		rolls: [roll],
		content: 'Roll result',
	};
	const handler = callbacks.get('createChatMessage')!;
	handler(message);
	expect(fireOverlayTrigger).toHaveBeenNthCalledWith(1, 'core.onPlayerRoll', {
		actor,
		user: author,
		roll,
		total: 17,
		formula: roll.formula,
		isCritical: false,
		isFumble: false,
	});
	expect(fireOverlayTrigger).toHaveBeenNthCalledWith(2, 'core.onChatMessage', {
		message,
		actor,
		user: author,
		content: 'Roll result',
		speakerAlias: actor.name,
	});
	fireOverlayTrigger.mockClear();
	handler({ author: author.id, speaker: message.speaker, whisper: [], isRoll: true, rolls: [roll] });
	expect(fireOverlayTrigger.mock.calls[0][1].user).toBe(author);
	fireOverlayTrigger.mockClear();
	handler({ author, whisper: ['gm'], isRoll: true, rolls: [roll] });
	expect(fireOverlayTrigger).not.toHaveBeenCalled();
});
