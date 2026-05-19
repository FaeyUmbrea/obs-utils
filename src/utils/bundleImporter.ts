import type { OverlayData } from './types.ts';
import { MODULE_ID } from './const.ts';
import { getApi } from './helpers.ts';

interface VMOverlayBundle {
	type: 'VMOverlayBundle';
	version: number;
	manifest: { id: string; name?: string; author?: string; license?: string; url?: string; obsUtilsMin?: string };
	system: string;
	overlays: OverlayData[];
	images: Record<string, string>;
}

export interface ImportBundleOptions {
	/** How to integrate the bundle's overlays into streamOverlays. */
	mode: 'append' | 'replace';
}

export interface ImportBundleResult {
	overlays: OverlayData[];
	/** Map of bundle:// path → final uploaded path. Useful for debugging. */
	uploadedPaths: Map<string, string>;
	/** Image keys that failed to upload (best-effort import; overlays still installed). */
	failedImages: string[];
}

/**
 * Validate a parsed JSON object as a VMOverlayBundle. Throws with a localized
 * message if the shape is wrong. Returns the bundle on success.
 */
export function validateBundle(parsed: unknown): VMOverlayBundle {
	const g = game as ReadyGame;
	const t = (key: string, data?: Record<string, string>) =>
		g.i18n.format(key, data ?? {});

	const fail = (reason: string) => {
		throw new Error(
			t('obs-utils.applications.overlayEditor.importDialog.bundleValidationFailed', { reason }),
		);
	};

	if (!parsed || typeof parsed !== 'object' || !('type' in parsed) || (parsed as any).type !== 'VMOverlayBundle') {
		fail('missing or wrong type field');
	}

	const b = parsed as Record<string, unknown>;

	if (typeof b.version !== 'number') fail('missing version');
	if (!b.manifest || typeof b.manifest !== 'object') fail('missing manifest');

	const m = b.manifest as Record<string, unknown>;
	if (typeof m.id !== 'string' || !m.id) fail('manifest.id must be a non-empty string');

	if (!Array.isArray(b.overlays)) fail('overlays must be an array');
	if (!b.images || typeof b.images !== 'object' || Array.isArray(b.images)) fail('images must be an object');

	return parsed as VMOverlayBundle;
}

/**
 * Import a parsed bundle into the current world.
 *
 * Uploads each inlined image into the module's persistent storage, builds a
 * rewrite map, applies the component image-slot handlers to swap bundle://
 * paths for the real uploaded paths, and stamps fresh IDs on every overlay and
 * component so they never collide with existing ones.
 */
export async function importBundle(bundle: VMOverlayBundle): Promise<ImportBundleResult> {
	const uploadedPaths = new Map<string, string>();
	const failedImages: string[] = [];

	// Upload images into persistent storage and build the rewrite map.
	await Promise.all(
		Object.entries(bundle.images).map(async ([filename, dataUrl]) => {
			const bundlePath = `bundle://images/${filename}`;
			try {
				const blob = await fetch(dataUrl).then(r => r.blob());
				const file = new File([blob], filename, { type: blob.type });
				const result = await (FilePicker as any).uploadPersistent(
					MODULE_ID,
					`bundles/${bundle.manifest.id}`,
					file,
				) as { path: string };
				uploadedPaths.set(bundlePath, result.path);
			} catch (e) {
				console.warn(`obs-utils bundle import: failed to upload ${filename}`, e);
				failedImages.push(filename);
			}
		}),
	);

	// Deep-clone, rewrite image refs, stamp fresh IDs.
	const overlays: OverlayData[] = JSON.parse(JSON.stringify(bundle.overlays));

	for (const overlay of overlays) {
		overlay.id = foundry.utils.randomID();

		const overlayType = getApi().overlayTypes.get(overlay.type);
		for (const component of overlay.components) {
			component.id = foundry.utils.randomID();

			const handlers = overlayType?.overlayComponentImageSlots.get(component.type);
			if (!handlers) continue;
			component.data = handlers.rewrite(component.data ?? '', uploadedPaths);
		}
	}

	return { overlays, uploadedPaths, failedImages };
}
