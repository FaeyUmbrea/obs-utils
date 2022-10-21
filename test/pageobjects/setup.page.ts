import Page from './page';

class SetupPage extends Page {
    public get btnSubmit () {
        return $('button[data-action="launchWorld"]');
    }

    public async setup () {
        await this.btnSubmit.click();
    }

    public open () {
        return super.open('setup');
    }
}

export default new SetupPage();