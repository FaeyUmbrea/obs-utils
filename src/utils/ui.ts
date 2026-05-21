import DirectorApplication from '../applications/director.ts';
import OBSRemoteApplication from '../applications/obsremote.ts';
import OverlayEditor from '../applications/overlayeditor.ts';
import AVEditor from '../svelte/components/editors/AVEditor.svelte';
import BooleanEditor from '../svelte/components/editors/BooleanEditor.svelte';
import BooleanImageEditor from '../svelte/components/editors/BooleanImageEditor.svelte';
import ImageEditor from '../svelte/components/editors/ImageEditor.svelte';
import MultiAVEditor from '../svelte/components/editors/MultiAVEditor.svelte';
import MultiAVIconEditor from '../svelte/components/editors/MultiAVIconEditor.svelte';
import MultiAVImageEditor from '../svelte/components/editors/MultiAVImageEditor.svelte';
import { MODULE_ID as moduleID } from './const';
import { getApi } from './helpers.js';

let d: DirectorApplication | undefined;

export async function openDirector(button: any) {
	if (!d) d = new DirectorApplication({}, button);
	if (!d.rendered) {
		d.render(true);
	} else {
		await d.close();
		d = undefined;
	}
}

export function registerUI() {
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'obsRemoteMenu', {
		name: `${moduleID}.settings.obsRemoteMenu.Name`,
		label: `${moduleID}.settings.obsRemoteMenu.Label`,
		hint: `${moduleID}.settings.obsRemoteMenu.Hint`,
		type: OBSRemoteApplication,
		icon: 'fas fa-bars',
		restricted: true,
	});
	(game as ReadyGame | undefined)?.settings?.registerMenu(moduleID, 'overlayEditor', {
		name: `${moduleID}.settings.overlayEditor.Name`,
		label: `${moduleID}.settings.overlayEditor.Label`,
		hint: `${moduleID}.settings.overlayEditor.Hint`,
		type: OverlayEditor,
		icon: 'fas fa-bars',
		restricted: true,
	});
	// Register component editors for both Simple ('sl') and WYSIWYG overlay types.
	// They share the same component renderers but maintain independent editor maps,
	// so each registration must happen for both keys.
	for (const overlayKey of ['sl', 'wysiwyg']) {
		const t = getApi().overlayTypes.get(overlayKey);
		if (!t) continue;
		t.registerComponentEditor('pt', AVEditor);
		t.registerComponentEditor('fai', AVEditor);
		t.registerComponentEditor('img', ImageEditor);
		t.registerComponentEditor('bav', BooleanEditor, true);
		t.registerComponentEditor('bavimg', BooleanImageEditor, true);
		t.registerComponentEditor('micoav', MultiAVIconEditor, true);
		t.registerComponentEditor('mimgav', MultiAVImageEditor, true);
		t.registerComponentEditor('pb', MultiAVEditor, true);
	}
}

