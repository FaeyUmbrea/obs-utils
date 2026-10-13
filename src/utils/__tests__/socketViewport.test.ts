import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	emit: vi.fn(),
	getLocalViewport: vi.fn(),
	getSetting: vi.fn(),
}));

vi.mock('../camera3D.ts', () => ({
	clearTrackedCamera3D: vi.fn(),
	getCamera3DStatus: () => 'inactive',
	readCamera3D: vi.fn(),
	receiveCamera3D: vi.fn(),
}));
vi.mock('../cameraSequencePlayer.ts', () => ({ playSequence: vi.fn() }));
vi.mock('../canvas', () => ({
	clampAndApplyExternal: vi.fn(),
	getCurrentUser: () => 'gm',
	getLocalViewport: mocks.getLocalViewport,
	VIEWPORT_DATA: new Map(),
	viewportChanged: vi.fn(),
}));
vi.mock('../helpers.ts', () => ({ getActiveGM: vi.fn(), isOBS: () => false }));
vi.mock('../settings.ts', () => ({ getSetting: mocks.getSetting, setSetting: vi.fn() }));

let socket: typeof import('../socket');

beforeEach(async () => {
	vi.resetModules();
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.spyOn(performance, 'now').mockReturnValue(1000);
	vi.stubGlobal('Hooks', { once: vi.fn() });
	vi.stubGlobal('game', { socket: { emit: mocks.emit } });
	vi.stubGlobal('canvas', { scene: { id: 'scene' }, level: { id: 'floor' } });
	mocks.getLocalViewport.mockReturnValue({ x: 10, y: 20, scale: 1 });
	mocks.getSetting.mockReturnValue('raw');
	socket = await import('../socket');
	socket.activateViewportTracking();
});

afterEach(() => {
	socket.deactivateViewportTracking();
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('viewport pan broadcasts', () => {
	it('fills omitted coordinates from the current local viewport', () => {
		socket.socketCanvas(canvas!, { scale: 2 });
		expect(mocks.emit).toHaveBeenCalledWith(expect.any(String), {
			eventType: 'viewport',
			targetUser: undefined,
			payload: { viewport: { x: 10, y: 20, scale: 2, level: 'floor' }, userId: 'gm' },
		});
	});

	it('preserves complete positions even when no local viewport exists', () => {
		mocks.getLocalViewport.mockReturnValue(null);
		socket.socketCanvas(canvas!, { x: 40, y: 50, scale: 0.5 });
		expect(mocks.emit.mock.calls[0][1].payload.viewport).toEqual({ x: 40, y: 50, scale: 0.5, level: 'floor' });
	});

	it('does not broadcast an incomplete position without a local fallback', () => {
		mocks.getLocalViewport.mockReturnValue(null);
		socket.socketCanvas(canvas!, { x: 40 });
		vi.advanceTimersByTime(200);
		expect(mocks.emit).not.toHaveBeenCalled();
	});

	it('does not broadcast non-finite coordinates', () => {
		socket.socketCanvas(canvas!, { x: Number.NaN });
		socket.socketCanvas(canvas!, { scale: Number.POSITIVE_INFINITY });
		vi.advanceTimersByTime(200);
		expect(mocks.emit).not.toHaveBeenCalled();
	});

	it('smooths completed samples without losing their zoom or producing NaN', () => {
		mocks.getSetting.mockReturnValue('smooth');
		socket.socketCanvas(canvas!, { x: 20 });
		socket.socketCanvas(canvas!, { x: 40, scale: 1.05 });
		vi.advanceTimersByTime(33);
		expect(mocks.emit.mock.calls[1][1].payload.viewport).toEqual({ x: 30, y: 20, scale: 1.05, level: 'floor' });
	});
});
