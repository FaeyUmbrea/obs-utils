function hideApplication(_, html){
    html.hide();
}
function hideTokenBorder(token){
    if(token?._object?.border?.alpha){
        token._object.border.alpha = 0;
    }
}

module.exports = {
    hideApplication: hideApplication,
    hideTokenBorder: hideTokenBorder
}