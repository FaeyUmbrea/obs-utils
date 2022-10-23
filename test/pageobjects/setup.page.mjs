import Page from './page.mjs';

class SetupPage extends Page {
    get btnSubmit () {
        return $('button[data-action="launchWorld"]');
    }

    async setup () {
        this.btnSubmit.click();
    }

    open (usebrowser) {
        return super.open('setup',usebrowser);
    }
}

export default new SetupPage();