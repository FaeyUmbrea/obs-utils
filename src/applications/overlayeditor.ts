import OverlayEditorUI from '../svelte/OverlayEditorUI.svelte';
import { getSetting, setSetting } from '../utils/settings.ts';
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
		resizable: true,
		focusAuto: false,
		actions: {
			import: OverlayEditor.importCommand,
			export: OverlayEditor.exportCommand,
		},
		window: {
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
			],
		},
	};

	protected override root = OverlayEditorUI;

	public static async importCommand() {
		new Dialog(
			{
				title: (game as ReadyGame).i18n.localize(
					'obs-utils.applications.overlayEditor.importDialog.title',
				),
				content: await renderTemplate(`templates/apps/import-data.${(game as ReadyGame).version.startsWith('12.') ? 'html' : 'hbs'}`, {
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
							readTextFromFile(form.data.files[0]).then(json =>
								importChatCommands(json, false),
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
							readTextFromFile(form.data.files[0]).then(json =>
								importChatCommands(json, true),
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
		new Dialog({
			title: (game as ReadyGame).i18n.localize(
				'obs-utils.applications.overlayEditor.exportDialog.title',
			),
			content: (game as ReadyGame).i18n.localize(
				'obs-utils.applications.overlayEditor.exportDialog.content',
			),
			buttons: {
				yes: {
					label: (game as ReadyGame).i18n.localize(
						'obs-utils.applications.overlayEditor.exportDialog.yesButton',
					),
					callback: () => exportChatCommands(),
				},
				no: {
					label: (game as ReadyGame).i18n.localize(
						'obs-utils.applications.overlayEditor.exportDialog.noButton',
					),
				},
			},
		}).render(true);
	}
}

function exportChatCommands() {
	const overlays = foundry.utils.deepClone(getSetting('streamOverlays'));

	const data = {
		type: 'ObsUtilsOverlays',
		version: 1,
		overlays,
		system: (game as ReadyGame).system?.id,
	};

	const filename = [
		'obsu',
		(game as ReadyGame).system?.id,
		(game as ReadyGame | undefined)?.world?.name,
		'overlays',
		new Date().toString(),
	].filterJoin('-');
	saveDataToFile(
		JSON.stringify(data, null, 2),
		'text/json',
		`${filename}.json`,
	);
}

async function importChatCommands(data: string, join: boolean) {
	const imported: { version: number; type: string; system: string; overlays: [] } = JSON.parse(data);
	if (imported.type !== 'ObsUtilsOverlays') {
		throw new Error(
			(game as ReadyGame).i18n.localize('obs-utils.applications.overlayEditor.importDialog.formatError'),
		);
	}
	if (imported.version !== 1) {
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
