import Page from './page';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class JoinPage extends Page {
    /**
     * define selectors using getter methods
     */
    public get inputUsername () {
        return $('select[name=userid]');
    }

    public get inputPassword () {
        return $('input[name=password]');
    }
    
    public get btnSubmit () {
        return $('button[name=join]');
    }

    /**
     * a method to encapsule automation code to interact with the page
     * e.g. to login using username and password
     */
    public async login (username: string, password: string) {
        //await (await this.inputUsername).setValue(username);
        await await this.inputUsername.selectByVisibleText(username);
        await await this.inputPassword.setValue(password);
        await this.btnSubmit.click();
    }

    /**
     * overwrite specific options to adapt it to page object
     */
    public open () {
        return super.open('join');
    }
}

export default new JoinPage();
