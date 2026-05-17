import { MODULE_ID } from './const.ts';
import { generateId } from './types.ts';

const FLAG_KEY = 'cameraPresets';

const CURRENT_VERSION = 1;

export interface CameraPreset {
	id: string;
	name: string;
	x: number;
	y: number;
	scale: number;
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
			return parsed.presets.filter(
				p => p && typeof p.id === 'string' && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.scale === 'number',
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
