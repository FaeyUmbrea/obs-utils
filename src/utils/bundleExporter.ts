import type { OverlayData } from './types.ts';
import { sanitizeBundleFilename, walkBundleImageRefs } from './bundleWalker.ts';
import { getApi } from './helpers.ts';

export interface BundleManifest {
	id: string;
	name: string;
	author: string;
	license: string;
	url?: string;
}

export interface VMOverlayBundle {
	type: 'VMOverlayBundle';
	version: 1;
	manifest: BundleManifest & { obsUtilsMin: string };
	system: string;
	overlays: OverlayData[];
	/** Map of bundle-local filename → data URL. Importer base64-decodes and uploads. */
	images: Record<string, string>;
}

/**
 * Build a single self-contained JSON object describing the bundle. Inline images
 * as data URLs avoids pulling a zip lib into the browser bundle and keeps the
 * file diff-friendly. Importer base64-decodes each image and uploads via
 * FilePicker.uploadPersistent on the consuming side.
 *
 * Images that 404 or fail to fetch are logged and omitted from `images`; the
 * overlay JSON still references the bundle:// path so the importer can fall
 * back to a placeholder.
 */
export async function buildBundle(
	overlays: OverlayData[],
	manifest: BundleManifest,
	system: string,
): Promise<VMOverlayBundle> {
	const { refs } = walkBundleImageRefs(overlays);

	// Build path-map: original → bundle://images/<sanitized>
	// Collision resolution: append -1, -2, etc. before the extension
	const pathMap = new Map<string, string>();
	const usedNames = new Set<string>();

	for (const original of refs.keys()) {
		let name = sanitizeBundleFilename(original);
		if (usedNames.has(name)) {
			const dot = name.lastIndexOf('.');
			const base = dot >= 0 ? name.slice(0, dot) : name;
			const ext = dot >= 0 ? name.slice(dot) : '';
			let counter = 1;
			let candidate = `${base}-${counter}${ext}`;
			while (usedNames.has(candidate)) {
				counter++;
				candidate = `${base}-${counter}${ext}`;
			}
			name = candidate;
		}
		usedNames.add(name);
		pathMap.set(original, `bundle://images/${name}`);
	}

	// Deep-clone overlays, then rewrite image refs in each component
	const rewrittenOverlays: OverlayData[] = JSON.parse(JSON.stringify(overlays));
	for (const overlay of rewrittenOverlays) {
		const overlayType = getApi().overlayTypes.get(overlay.type);
		for (const component of overlay.components) {
			const handlers = overlayType?.overlayComponentImageSlots.get(component.type);
			if (!handlers) continue;
			component.data = handlers.rewrite(component.data ?? '', pathMap);
		}
	}

	// Fetch each image and inline as a data URL.
	const images: Record<string, string> = {};
	await Promise.all(
		Array.from(refs.keys()).map(async (original) => {
			const bundlePath = pathMap.get(original)!;
			const filename = bundlePath.slice('bundle://images/'.length);
			try {
				const res = await fetch(original);
				if (!res.ok) {
					console.warn(`obs-utils bundle: skipping ${original} (${res.status})`);
					return;
				}
				const blob = await res.blob();
				const dataUrl = await blobToDataUrl(blob);
				images[filename] = dataUrl;
			} catch (e) {
				console.warn(`obs-utils bundle: failed to fetch ${original}`, e);
			}
		}),
	);

	return {
		type: 'VMOverlayBundle',
		version: 1,
		manifest: { ...manifest, obsUtilsMin: '5.1.0' },
		system,
		overlays: rewrittenOverlays,
		images,
	};
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}
