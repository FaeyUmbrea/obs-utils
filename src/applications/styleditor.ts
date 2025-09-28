import type { DeepPartial } from 'fvtt-types/utils';
import StyleEditorUi from '../svelte/StyleEditorUi.svelte';
import { SvelteApplicationMixin } from './mixin.svelte.ts';

export default class StyleEditor extends SvelteApplicationMixin(foundry.applications.api.ApplicationV2) {
	style: string;
	callback: (style: string) => void | Promise<void>;

	constructor(options: DeepPartial<foundry.applications.api.ApplicationV2.Configuration>, style: string, callback: (style: string) => void | Promise<void>) {
		super(options);
		this.style = style;
		this.callback = callback;
	}

	static override DEFAULT_OPTIONS = {
		classes: ['styleeditor', 'themed'],
		id: 'styleeditor-application',
		title: 'obs-utils.applications.styleEditor.name',
		// tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
		position: {
			height: 125,
			width: 400,
		},
		// resizable: true,
	};

	protected override root = StyleEditorUi;

	async close(options = {}) {
		this.callback(this.style);
		return super.close(options);
	}
}
