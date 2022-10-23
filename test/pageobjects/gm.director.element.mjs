class GMDirector{

    get buttonAllTokensIC () {
        return gmClient.$("div[id=director-application] label[for=radioictrackall]")
    }
    get buttonCurrentTokensIC () {
        return gmClient.$("div[id=director-application] label[for=radioictrackone]")
    }
    get buttonClonePlayerIC () {
        return gmClient.$("div[id=director-application] label[for=radioicclonePlayer]")
    }
    get buttonCloneDMIC () {
        return gmClient.$("div[id=director-application] label[for=radioiccloneDM]")
    }
    get buttonTurnPlayerIC () {
        return gmClient.$("div[id=director-application] label[for=radioiccloneTurnPlayer]")
    }
    get buttonBirdsEyeIC () {
        return gmClient.$("div[id=director-application] label[for=radioicbirdseye]")
    }

    get buttonAllTokensOOC () {
        return gmClient.$("div[id=director-application] label[for=radioooctrackall]")
    }
    get buttonSelectedTokensOOC () {
        return gmClient.$("div[id=director-application] label[for=radioooctrackmanual]")
    }
    get buttonClonePlayerOOC () {
        return gmClient.$("div[id=director-application] label[for=radiooocclonePlayer]")
    }
    get buttonCloneDMOOC () {
        return gmClient.$("div[id=director-application] label[for=radioooccloneDM]")
    }
    get buttonBirdsEyeOOC () {
        return gmClient.$("div[id=director-application] label[for=radiooocbirdseye]")
    }

}

export default new GMDirector();