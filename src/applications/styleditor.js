import {SvelteApplication} from "@typhonjs-fvtt/runtime/svelte/application";
import StyleEditorUi from "../svelte/StyleEditorUi.svelte";

export default class StyleEditor extends SvelteApplication {
  style;
  callback;

  constructor(style, callback) {
    super();
    this.style = style;
    this.callback = callback;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['styleeditor'],
      id: 'styleeditor-application',
      title: 'Style Editor',
      //tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 125,
      width: 400,
      //resizable: true,
      svelte: {
        class: StyleEditorUi,
        target: document.body
      }
    });
  }

  async close(options = {}) {
    this.callback(this.style);
    return super.close(options);
  }
}
