import type { OverlayData } from './types.ts';
import { getApi } from './helpers.ts';

export interface WalkerResult {
	/** Map of original path → list of components using it. */
	refs: Map<string, Array<{ overlayId: string; componentIndex: number }>>;
}

const IMAGE_EXTENSIONS = /\.(?:png|jpe?g|gif|webp|svg|avif|woff2?)$/i;
const IMAGE_PROTOCOLS = /^(?:https?:|data:|bundle:)/;

function isImageRef(path: string): boolean {
	if (!path) return false;
	if (IMAGE_PROTOCOLS.test(path)) return true;
	if (path.includes('/')) return true;
	if (IMAGE_EXTENSIONS.test(path)) return true;
	return false;
}

export function walkBundleImageRefs(overlays: OverlayData[]): WalkerResult {
	const refs: Map<string, Array<{ overlayId: string; componentIndex: number }>> = new Map();

	for (const overlay of overlays) {
		const overlayType = getApi().overlayTypes.get(overlay.type);
		for (let i = 0; i < overlay.components.length; i++) {
			const component = overlay.components[i];
			const handlers = overlayType?.overlayComponentImageSlots.get(component.type);
			if (!handlers) continue;
			const paths = handlers.extract(component.data ?? '');
			for (const p of paths) {
				if (!p || p.startsWith('bundle://') || !isImageRef(p)) continue;
				const entry = refs.get(p) ?? [];
				entry.push({ overlayId: overlay.id ?? String(i), componentIndex: i });
				refs.set(p, entry);
			}
		}
	}

	return { refs };
}

export function sanitizeBundleFilename(originalPath: string): string {
	// Take only the basename
	const slash = originalPath.lastIndexOf('/');
	const basename = slash >= 0 ? originalPath.slice(slash + 1) : originalPath;
	// Replace anything outside alphanumerics, dot, and dash with a dash, then collapse runs
	return basename.replace(/[^A-Z\d.-]+/gi, '-').replace(/-{2,}/g, '-');
}
