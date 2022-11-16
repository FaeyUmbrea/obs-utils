import '../less/styleeditor.less';

const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/formapps.hbs';

export default class StyleEditor extends FormApplication<any, any, any> {
  style: string;
  callback: CallableFunction;

  constructor(style: string, callback: CallableFunction) {
    super();
    this.style = style;
    this.callback = callback;
  }
  protected async _updateObject(event: Event, formData?: object | undefined) {
    if (!(formData instanceof Object)) throw new Error('Form Data Empty');
    this.callback(formData['style' as keyof typeof formData]);
  }

  getData() {
    return this.style;
  }

  static get defaultOptions(): FormApplicationOptions {
    return mergeObject(super.defaultOptions, {
      classes: ['styleeditor'],
      template: DICECTOR_TEMPLATE,
      id: 'styleeditor-application',
      title: 'Style Editor',
      //tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'onLoad' }],
      height: 125,
      width: 400,
      //resizable: true,
    }) as FormApplicationOptions;
  }

  protected async _renderInner(data: any): Promise<JQuery<HTMLElement>> {
    const html = await super._renderInner(data);
    const StyleEditorUI = await (await import('../svelte/StyleEditor.svelte')).default;
    new StyleEditorUI({
      target: html.get(0) as Element,
      props: {
        style: this.style,
      },
    });
    return html;
  }
}
