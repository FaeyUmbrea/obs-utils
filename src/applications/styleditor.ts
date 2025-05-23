import type { SvelteApp } from '#runtime/svelte/application';
import { SvelteApplication } from '#runtime/svelte/application';
import StyleEditorUi from '../svelte/StyleEditorUi.svelte';

// @ts-expect-error mixins dont work
export default class StyleEditor extends SvelteApplication<Options> {
	style: string;
	callback: (style: string) => void | Promise<void>;

	constructor(style: string, callback: (style: string) => void | Promise<void>) {
		super();
		this.style = style;
		this.callback = callback;
	}

	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			classes: ['styleeditor', 'themed'],
			id: 'styleeditor-application',
			title: 'obs-utils.applications.styleEditor.name',
			// tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
			height: 125,
			width: 400,
			// resizable: true,
			svelte: {
				class: StyleEditorUi,
				target: document.body,
			},
		});
	}

	async close(options = {}) {
		this.callback(this.style);
		return super.close(options);
	}
}

export type External = SvelteApp.Context.External<StyleEditor>;
export interface Options extends SvelteApp.Options {
	style: string;
}
