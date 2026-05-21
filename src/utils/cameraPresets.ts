import type gsap from 'gsap';
import { MODULE_ID } from './const.ts';
import { cubicBezier } from './gsap.ts';
import { generateId } from './types.ts';

const FLAG_KEY = 'cameraPresets';

const CURRENT_VERSION = 1;

export type EasingKind
	= 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
		| 'power1.in' | 'power1.out' | 'power1.inOut'
		| 'power2.in' | 'power2.out' | 'power2.inOut'
		| 'power3.in' | 'power3.out' | 'power3.inOut'
		| 'sine.in' | 'sine.out' | 'sine.inOut'
		| 'back.in' | 'back.out' | 'back.inOut'
		| { cubicBezier: [number, number, number, number] };

export type LoopMode = 'none' | 'restart' | 'pingpong';

export interface CameraKeyframe {
	/** Absolute milliseconds from sequence start. */
	time: number;
	x: number;
	y: number;
	scale: number;
	/** Easing applied FROM the previous keyframe TO this one. */
	easing: EasingKind;
}

export interface CameraPreset {
	id: string;
	name: string;
	/** Legacy single-waypoint fields (still honored when `keyframes` is empty/missing). */
	x: number;
	y: number;
	scale: number;
	/** When non-empty, this preset is a keyframed sequence; top-level x/y/scale are ignored at playback. */
	keyframes?: CameraKeyframe[];
	loop?: LoopMode;
	/**
	 * Composition duration in ms. Defines the playback window — the timeline
	 * holds at the last keyframe's values until this time elapses, so loop
	 * (especially ping-pong) bounces at the full duration rather than at the
	 * last keyframe. Optional; absent presets default to the last keyframe time.
	 */
	durationMs?: number;
}

/** Map our EasingKind values to GSAP ease strings / functions. */
export function toGsapEase(easing: EasingKind): string | gsap.EaseFunction {
	if (typeof easing === 'object' && 'cubicBezier' in easing) {
		const [x1, y1, x2, y2] = easing.cubicBezier;
		return cubicBezier(x1, y1, x2, y2);
	}
	switch (easing) {
		// CSS-style aliases → power1
		case 'easeIn': return 'power1.in';
		case 'easeOut': return 'power1.out';
		case 'easeInOut': return 'power1.inOut';
		// Everything else maps directly; GSAP understands these strings natively.
		default: return easing;
	}
}

interface PresetStorageV1 {
	version: 1;
	presets: CameraPreset[];
}

type PresetStorage = PresetStorageV1;

/**
 * Read the camera presets stored on a scene's `flags['obs-utils'].cameraPresets`
 * flag. The flag is a JSON string wrapping a versioned object so the schema can
 * evolve without breaking existing worlds.
 *
 * Defensive: returns `[]` if the flag is missing, malformed, or carries a
 * future/unknown version.
 */
export function readPresets(scene: any): CameraPreset[] {
	if (!scene) return [];
	const raw = scene.getFlag?.(MODULE_ID, FLAG_KEY) as string | undefined;
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as PresetStorage;
		if (parsed?.version === CURRENT_VERSION && Array.isArray(parsed.presets)) {
			// Normalize: drop entries missing required fields.
			// A preset is valid if it has the legacy x/y/scale OR a non-empty keyframes array.
			return parsed.presets.filter(
				p => p && typeof p.id === 'string'
					&& (
						(typeof p.x === 'number' && typeof p.y === 'number' && typeof p.scale === 'number')
						|| (Array.isArray(p.keyframes) && p.keyframes.length > 0)
					),
			);
		}
	} catch {
		// Swallow parse errors — treat as no presets. The flag isn't authoritative
		// for module function, so wiping a corrupt value on the next write is fine.
	}
	return [];
}

/** Persist the preset list back to the scene flag. Stringifies the versioned wrapper. */
export async function writePresets(scene: any, presets: CameraPreset[]): Promise<void> {
	if (!scene) return;
	const payload: PresetStorage = { version: CURRENT_VERSION, presets };
	await scene.setFlag?.(MODULE_ID, FLAG_KEY, JSON.stringify(payload));
}

/** Build a fresh preset from a captured viewport with a numbered default name. */
export function makePreset(viewport: { x: number; y: number; scale: number }, index: number): CameraPreset {
	return {
		id: generateId(),
		name: `Preset ${index + 1}`,
		x: Math.round(viewport.x),
		y: Math.round(viewport.y),
		scale: viewport.scale,
	};
}
