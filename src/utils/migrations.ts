import type { OverlayData } from './types.ts';
import { getExampleOverlay, makeRollOverlayFromLegacyConfig } from './defaultOverlays.ts';
import { getSetting, setSetting, SETTINGS_VERSION } from './settings.ts';
import { OBSRemoteSettings, OBSWebsocketSettings } from './types.ts';

// Stepwise schema migrations. settings.ts dynamically imports this module
// only when `version < SETTINGS_VERSION`, so the per-version code stays out
// of the steady-state bundle entirely.
export async function runMigrationsImpl(version: number): Promise<void> {
	console.warn('Running OBS Utils Migrations');

	if (version < 1) {
		console.warn('Migrations for Data-Model Version 1');
		let obssettings = getSetting('websocketSettings');
		obssettings = foundry.utils.mergeObject(
			new OBSWebsocketSettings(),
			obssettings,
		);
		// @ts-expect-error legacy field that should not exist, hence the explicit delete
		delete obssettings.onCloseObs;
		await setSetting('websocketSettings', obssettings);
	}

	if (version < 2) {
		console.warn('Migrations for Data-Model Version 2');
		let obssettings = getSetting('obsRemote');
		obssettings = foundry.utils.mergeObject(
			new OBSRemoteSettings(),
			obssettings,
		);
		await setSetting('obsRemote', obssettings);
	}

	if (version < 3) {
		console.warn('Migrations for Data-Model Version 3');

		const actors = getSetting('overlayActors') ?? [];
		await setSetting('overlayActorsModified', (actors as string[]).length > 0);

		const currentOverlays = (getSetting('streamOverlays') ?? []) as OverlayData[];
		if (currentOverlays.length === 0) {
			currentOverlays.push(getExampleOverlay());
			await setSetting('streamOverlays', currentOverlays);
		}

		// Fold the legacy named event arrays into the registry-keyed customEvents map.
		// All built-in event types are namespaced under 'core.*'.
		const obs = getSetting('obsRemote');
		if (obs) {
			const customEvents: Record<string, any[]> = (obs as any).customEvents ?? {};
			const fold = (legacyKey: string, registryKey: string) => {
				const arr = (obs as any)[legacyKey];
				if (Array.isArray(arr) && arr.length > 0 && !customEvents[registryKey]?.length) {
					customEvents[registryKey] = [{ conditions: {}, actions: arr }];
				}
			};
			fold('onLoad', 'core.onLoad');
			fold('onCombatStart', 'core.onCombatStart');
			fold('onCombatEnd', 'core.onCombatEnd');
			fold('onPause', 'core.onPause');
			fold('onUnpause', 'core.onUnpause');
			fold('onStopStreaming', 'core.onStopStreaming');
			// onSceneLoad is per-scene — each legacy entry becomes its own instance.
			const sceneLegacy = (obs as any).onSceneLoad;
			if (Array.isArray(sceneLegacy) && sceneLegacy.length > 0 && !customEvents['core.onSceneLoad']?.length) {
				customEvents['core.onSceneLoad'] = sceneLegacy.map((sle: any) => ({
					conditions: { sceneName: sle?.sceneName ?? '' },
					actions: sle?.obsActions ?? [],
				}));
			}
			(obs as any).customEvents = customEvents;
			await setSetting('obsRemote', obs);
		}
	}

	if (version < 4) {
		console.warn('Migrations for Data-Model Version 4');
		// 5.0 carried a dedicated `roll` overlay type whose config field held
		// the pre/roll/post timing and image paths. 5.1 removes that type in
		// favor of trigger-driven canvas overlays. Convert any surviving
		// `type: 'roll'` entries in-place using the same factory the
		// 4.x → 5.1 manual rebuild snippet calls, so output is identical
		// regardless of the upgrade path.
		const current = (getSetting('streamOverlays') ?? []) as OverlayData[];
		let mutated = false;
		for (let i = 0; i < current.length; i++) {
			if ((current[i] as { type?: string })?.type === 'roll') {
				const legacyConfig = ((current[i] as { config?: Record<string, unknown> }).config ?? {}) as Parameters<typeof makeRollOverlayFromLegacyConfig>[0];
				const replacement = makeRollOverlayFromLegacyConfig(legacyConfig);
				// Preserve the existing overlay id so user CSS / references survive.
				replacement.id = current[i].id;
				current[i] = replacement;
				mutated = true;
			}
		}
		if (mutated) await setSetting('streamOverlays', current);
	}

	console.warn('OBS Utils Migrations Finished');
	await setSetting('settingsVersion', SETTINGS_VERSION);
}
