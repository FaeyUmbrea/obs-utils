import { SvelteApplication } from '#runtime/svelte/application';
import { localize } from '#runtime/util/i18n';
import OverlayEditorUI from '../svelte/OverlayEditorUI.svelte';
import { getSetting, setSetting } from '../utils/settings.ts';

// @ts-expect-error mixins dont work
export default class OverlayEditor extends SvelteApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['overlayeditor', 'themed'],
			id: 'overlayeditor-application',
			title: localize('obs-utils.applications.overlayEditor.name'),
			// tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
			height: 600,
			width: 1000,
			zIndex: 95,
			resizable: true,
			focusAuto: false,
			svelte: {
				class: OverlayEditorUI,
				target: document.body,
			},
		});
	}

	_getHeaderButtons() {
		const buttons = super._getHeaderButtons();

		buttons.unshift(
			{
				icon: 'fas fa-file-import',
				label: localize('obs-utils.applications.overlayEditor.importButton'),
				class: 'obs-button',

				async onclick() {
					new Dialog(
						{
							title: localize(
								'obs-utils.applications.overlayEditor.importDialog.title',
							),
							content: await renderTemplate(`templates/apps/import-data.${(game as ReadyGame).version.startsWith('12.') ? 'html' : 'hbs'}`, {
								hint1: localize(
									'obs-utils.applications.overlayEditor.importDialog.hint1',
								),
								hint2: localize(
									'obs-utils.applications.overlayEditor.importDialog.hint2',
								),
							}),
							buttons: {
								replace: {
									icon: '<i class="fas fa-file-import"></i>',
									label: localize(
										'obs-utils.applications.overlayEditor.importDialog.replaceButton',
									),
									callback: (html) => {
										const form = (html as JQuery<HTMLElement>).find('form')[0];
										if (!form.data.files.length) {
											return ui?.notifications?.error(
												localize(
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
									label: localize(
										'obs-utils.applications.overlayEditor.importDialog.appendButton',
									),
									callback: (html) => {
										const form = (html as JQuery<HTMLElement>).find('form')[0];
										if (!form.data.files.length) {
											return ui?.notifications?.error(
												localize(
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
									label: localize(
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
				},
			},
			{
				icon: 'fas fa-file-export',
				label: localize('obs-utils.applications.overlayEditor.exportButton'),

				class: 'obs-button',

				onclick() {
					new Dialog({
						title: localize(
							'obs-utils.applications.overlayEditor.exportDialog.title',
						),
						content: localize(
							'obs-utils.applications.overlayEditor.exportDialog.content',
						),
						buttons: {
							yes: {
								label: localize(
									'obs-utils.applications.overlayEditor.exportDialog.yesButton',
								),
								callback: () => exportChatCommands(),
							},
							no: {
								label: localize(
									'obs-utils.applications.overlayEditor.exportDialog.noButton',
								),
							},
						},
					}).render(true);
				},
			},
		);

		return buttons;
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
			localize('obs-utils.applications.overlayEditor.importDialog.formatError'),
		);
	}
	if (imported.version !== 1) {
		throw new Error(
			localize(
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
