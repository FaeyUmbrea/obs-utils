import Page from './page.mjs';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class JoinPage extends Page {
    /**
     * define selectors using getter methods
     */
    get inputUsername () {
        return gmClient.$('select[name=userid]');
    }

    get inputPassword () {
        return gmClient.$('input[name=password]');
    }
    
    get btnSubmit () {
        return gmClient.$('button[name=join]');
    }

    /**
     * a method to encapsule automation code to interact with the page
     * e.g. to login using username and password
     */
    async login (username, password) {
        await await this.inputUsername.selectByVisibleText(username);
        await await this.inputPassword.setValue(password);
        this.btnSubmit.click();
    }

    /**
     * overwrite specific options to adapt it to page object
     */
    open () {
        return super.open('join');
    }
}

export default new JoinPage();
