import Page from './page.mjs';
import _ from 'lodash';

/**
 * sub page containing specific selectors and methods for a specific page
 */
class GamePage extends Page {

    get body () {
        return obsClient.$("body.stream");
    }

    get chat () {
        return obsClient.$("ol#chat-log");
    }

    open (){
        super.open("stream",obsClient)
    }

}

export default new GamePage();
