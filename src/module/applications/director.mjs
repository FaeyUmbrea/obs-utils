const DICECTOR_TEMPLATE = 'modules/obs-utils/templates/director.hbs';

Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});

export default class Director extends Application {
  constructor(buttonData,sidebarButton) {
    super();
    this.buttonData = buttonData;
    this.sidebarButton = sidebarButton;
  }

  getData() {
    return this.buttonData;
  }

  activateListeners(html) {
    super.activateListeners();
    const buttonData = this.buttonData;
    html.find('input[type=radio][name=ic]').change(function () {
      var id = this.value;
      buttonData.callback(true, id);
    });
    html.find('input[type=radio][name=ooc]').change(function () {
      var id = this.value;
      buttonData.callback(false, id);
    });
    html.find('select').change(function () {
      var id = this.value;
      buttonData.trackCallback(id);
    });
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['obsdirector'],
      popOut: true,
      minimizable: true,
      width: 230,
      template: DICECTOR_TEMPLATE,
      id: 'director-application',
      title: 'Director',
    });
  }

  close(){
    super.close();
    $("[data-tool=openStreamDirector]").removeClass("active")
    this.sidebarButton.active = false;
  }
}
