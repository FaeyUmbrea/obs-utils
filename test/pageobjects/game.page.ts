import { ChainablePromiseElement } from 'webdriverio';

import Page from './page';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class GamePage extends Page {
    /**
     * define selectors using getter methods
     */
    public get canvas () {
        return $('canvas');
    }
}

export default new GamePage();
