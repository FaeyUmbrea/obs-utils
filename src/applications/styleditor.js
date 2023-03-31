import '../less/styleeditor.less';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class StyleEditor extends FormApplication{
  style;
  callback;

  constructor(style, callback) {
    super();
    this.style = style;
    this.callback = callback;
  }
  async _updateObject(event, formData) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    this.callback(formData['style']);
  }

  getData() {
    return this.style;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['styleeditor'],
      template: DICECTOR_TEMPLATE,
      id: 'styleeditor-application',
      title: 'Style Editor',
      //tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 125,
      width: 400,
      //resizable: true,
    });
  }

  async _renderInner(data){
    const html = await super._renderInner(data);
    const StyleEditorUI = await (await import('../svelte/StyleEditor.svelte')).default;
    new StyleEditorUI({
      target: html.get(0),
      props: {
        style: this.style,
      },
    });
    return html;
  }
}
