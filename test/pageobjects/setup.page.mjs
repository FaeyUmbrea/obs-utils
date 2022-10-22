import Page from './page.mjs';

class SetupPage extends Page {
    get btnSubmit () {
        return $('button[data-action="launchWorld"]');
    }

    async setup () {
        this.btnSubmit.click();
    }

    open () {
        return super.open('setup');
    }
}

export default new SetupPage();