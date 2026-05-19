import Composer from '../svelte/composer/Composer.svelte';
import { buildBundle } from '../utils/bundleExporter.ts';
import { importBundle, validateBundle } from '../utils/bundleImporter.ts';
import { getSetting, setSetting } from '../utils/settings.ts';
import GlobalCSSEditor from './globalcsseditor.ts';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class OverlayEditor extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	static override DEFAULT_OPTIONS = {
		classes: ['overlayeditor', 'themed'],
		id: 'overlayeditor-application',
		title: (game as ReadyGame).i18n.localize('obs-utils.applications.overlayEditor.name'),
		// tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
		position: {
			height: 600,
			width: 1000,
		},
		zIndex: 95,
		focusAuto: false,
		actions: {
			import: OverlayEditor.importCommand,
			export: OverlayEditor.exportCommand,
			openGlobalCSS: OverlayEditor.openGlobalCSSCommand,
		},
		window: {
			resizable: true,
			controls: [
				{
					icon: 'fas fa-file-import',
					label: 'obs-utils.applications.overlayEditor.importButton',
					action: 'import',
				},
				{
					icon: 'fas fa-file-export',
					label: 'obs-utils.applications.overlayEditor.exportButton',
					action: 'export',
				},
				{
					icon: 'fab fa-css3-alt',
					label: 'obs-utils.applications.globalCSSEditor.menuLabel',
					action: 'openGlobalCSS',
				},
			],
		},
	};

	public static async openGlobalCSSCommand() {
		new GlobalCSSEditor({}).render({ force: true });
	}

	protected override root = Composer;

	public static async importCommand() {
		new foundry.appv1.api.Dialog(
			{
				title: (game as ReadyGame).i18n.localize(
					'obs-utils.applications.overlayEditor.importDialog.title',
				),
				content: await foundry.applications.handlebars.renderTemplate('templates/apps/import-data.hbs', {
					hint1: (game as ReadyGame).i18n.localize(
						'obs-utils.applications.overlayEditor.importDialog.hint1',
					),
					hint2: (game as ReadyGame).i18n.localize(
						'obs-utils.applications.overlayEditor.importDialog.hint2',
					),
				}),
				buttons: {
					replace: {
						icon: '<i class="fas fa-file-import"></i>',
						label: (game as ReadyGame).i18n.localize(
							'obs-utils.applications.overlayEditor.importDialog.replaceButton',
						),
						callback: (html) => {
							const form = (html as JQuery<HTMLElement>).find('form')[0];
							if (!form.data.files.length) {
								return ui?.notifications?.error(
									(game as ReadyGame).i18n.localize(
										'obs-utils.applications.overlayEditor.importDialog.fileError',
									),
								);
							}
							foundry.utils.readTextFromFile(form.data.files[0]).then(text =>
								importFromFileText(text, 'replace'),
							);
						},
					},
					append: {
						icon: '<i class="fas fa-file-import"></i>',
						label: (game as ReadyGame).i18n.localize(
							'obs-utils.applications.overlayEditor.importDialog.appendButton',
						),
						callback: (html) => {
							const form = (html as JQuery<HTMLElement>).find('form')[0];
							if (!form.data.files.length) {
								return ui?.notifications?.error(
									(game as ReadyGame).i18n.localize(
										'obs-utils.applications.overlayEditor.importDialog.fileError',
									),
								);
							}
							foundry.utils.readTextFromFile(form.data.files[0]).then(text =>
								importFromFileText(text, 'append'),
							);
						},
					},
					no: {
						icon: '<i class="fas fa-times"></i>',
						label: (game as ReadyGame).i18n.localize(
							'obs-utils.applications.overlayEditor.importDialog.cancelButton',
						),
					},
				},
				default: 'import',
			},
			{
				width: 400,
			},
		).render(true);
	}

	public static async exportCommand() {
		const g = game as ReadyGame;
		new foundry.appv1.api.Dialog({
			title: g.i18n.localize('obs-utils.applications.overlayEditor.exportDialog.title'),
			content: g.i18n.localize('obs-utils.applications.overlayEditor.exportDialog.content'),
			buttons: {
				json: {
					label: g.i18n.localize('obs-utils.applications.overlayEditor.exportDialog.yesButton'),
					callback: () => exportChatCommands(),
				},
				bundle: {
					label: g.i18n.localize('obs-utils.applications.overlayEditor.exportDialog.bundleButton'),
					callback: () => openBundleManifestDialog(),
				},
				no: {
					label: g.i18n.localize('obs-utils.applications.overlayEditor.exportDialog.noButton'),
				},
			},
		}).render(true);
	}
}

function exportChatCommands() {
	const overlays = foundry.utils.deepClone(getSetting('streamOverlays'));

	const data = {
		type: 'ObsUtilsOverlays',
		// v2: introduced overlay/component IDs, customCSS fields, name/enabled flags.
		// v1 imports are still accepted (forward-compatible: IDs are backfilled on load).
		version: 2,
		overlays,
		system: (game as ReadyGame).system?.id,
	};

	const filename = [
		'obsu',
		(game as ReadyGame).system?.id,
		(game as ReadyGame | undefined)?.world?.id,
		'overlays',
		new Date().toString(),
	].filterJoin('-');
	foundry.utils.saveDataToFile(
		JSON.stringify(data, null, 2),
		'text/json',
		`${filename}.json`,
	);
}

function openBundleManifestDialog() {
	const g = game as ReadyGame;
	const t = (key: string) => g.i18n.localize(key);
	const content = `
<form>
  <h3>${t('obs-utils.applications.overlayEditor.exportDialog.bundleFormTitle')}</h3>
  <div class="form-group">
    <label>${t('obs-utils.applications.overlayEditor.exportDialog.bundleId')}</label>
    <input type="text" name="id" value="${g.world?.id ?? ''}" />
  </div>
  <div class="form-group">
    <label>${t('obs-utils.applications.overlayEditor.exportDialog.bundleName')}</label>
    <input type="text" name="name" value="" />
  </div>
  <div class="form-group">
    <label>${t('obs-utils.applications.overlayEditor.exportDialog.bundleAuthor')}</label>
    <input type="text" name="author" value="${g.user?.name ?? ''}" />
  </div>
  <div class="form-group">
    <label>${t('obs-utils.applications.overlayEditor.exportDialog.bundleLicense')}</label>
    <input type="text" name="license" value="CC-BY-SA-4.0" />
  </div>
  <div class="form-group">
    <label>${t('obs-utils.applications.overlayEditor.exportDialog.bundleUrl')}</label>
    <input type="text" name="url" value="" />
  </div>
</form>`.trim();

	new foundry.appv1.api.Dialog({
		title: t('obs-utils.applications.overlayEditor.exportDialog.bundleFormTitle'),
		content,
		buttons: {
			export: {
				icon: '<i class="fas fa-file-archive"></i>',
				label: t('obs-utils.applications.overlayEditor.exportDialog.bundleButton'),
				callback: (html) => {
					const form = (html as JQuery<HTMLElement>).find('form')[0] as HTMLFormElement;
					const fd = new FormData(form);
					const manifest = {
						id: (fd.get('id') as string) || (g.world?.id ?? ''),
						name: (fd.get('name') as string) || '',
						author: (fd.get('author') as string) || '',
						license: (fd.get('license') as string) || '',
						url: (fd.get('url') as string) || undefined,
					};
					exportBundle(manifest);
				},
			},
			cancel: {
				label: t('obs-utils.applications.overlayEditor.exportDialog.noButton'),
			},
		},
		default: 'export',
	}).render(true);
}

async function exportBundle(manifest: { id: string; name: string; author: string; license: string; url?: string }) {
	const g = game as ReadyGame;
	const overlays = getSetting('streamOverlays') ?? [];
	const system = g.system?.id ?? '';

	const bundle = await buildBundle(overlays, manifest, system);

	const filename = [
		'obsu',
		manifest.id || system,
		'bundle',
		new Date().toISOString().slice(0, 10),
	].filter(Boolean).join('-');

	foundry.utils.saveDataToFile(
		JSON.stringify(bundle, null, 2),
		'application/json',
		`${filename}.vmoverlay`,
	);
}

async function importFromFileText(text: string, mode: 'append' | 'replace') {
	const g = game as ReadyGame;
	const parsed: unknown = JSON.parse(text);

	if (parsed && typeof parsed === 'object' && 'type' in parsed && (parsed as any).type === 'VMOverlayBundle') {
		const bundle = validateBundle(parsed);
		const result = await importBundle(bundle);

		if (mode === 'append') {
			const overlays = getSetting('streamOverlays');
			overlays!.push(...result.overlays);
			await setSetting('streamOverlays', overlays ?? []);
		} else {
			await setSetting('streamOverlays', result.overlays);
		}

		ui?.notifications?.info(
			g.i18n.format('obs-utils.applications.overlayEditor.importDialog.bundleImported', {
				name: bundle.manifest.name ?? bundle.manifest.id,
				count: String(result.overlays.length),
			}),
		);

		if (result.failedImages.length > 0) {
			ui?.notifications?.warn(
				g.i18n.format('obs-utils.applications.overlayEditor.importDialog.bundleImageWarning', {
					names: result.failedImages.join(', '),
				}),
			);
		}
		return;
	}

	if (parsed && typeof parsed === 'object' && 'type' in parsed && (parsed as any).type === 'ObsUtilsOverlays') {
		await importChatCommands(parsed as { version: number; type: string; system: string; overlays: [] }, mode === 'append');
		return;
	}

	ui?.notifications?.error(
		g.i18n.localize('obs-utils.applications.overlayEditor.importDialog.unknownType'),
	);
}

async function importChatCommands(imported: { version: number; type: string; system: string; overlays: [] }, join: boolean) {
	if (imported.version !== 1 && imported.version !== 2) {
		throw new Error(
			(game as ReadyGame).i18n.localize(
				'obs-utils.applications.overlayEditor.importDialog.versionError',
			),
		);
	}
	if (join) {
		const overlays = getSetting('streamOverlays');
		overlays!.push(...imported.overlays);
		await setSetting('streamOverlays', overlays ?? []);
	} else {
		await setSetting('streamOverlays', imported.overlays);
	}
}
