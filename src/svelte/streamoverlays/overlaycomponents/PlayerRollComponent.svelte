<script>

    import {getSetting} from "../../../utils/settings.js";
    import {fade} from 'svelte/transition';
    import {onDestroy} from "svelte";


    export let playerId;

    let preRollDelay = getSetting("rollOverlayPreRollDelay");
    let preRollStay = getSetting("rollOverlayPreRollStay");
    let preRollFadeIn = getSetting("rollOverlayPreRollFadeIn");
    let preRollFadeOut = getSetting("rollOverlayPreRollFadeOut");
    let rollDelay = preRollDelay + preRollFadeIn + preRollStay + preRollFadeOut;
    let rollStay = getSetting("rollOverlayRollStay");
    let rollFadeIn = getSetting("rollOverlayRollFadeIn");
    let rollFadeOut = getSetting("rollOverlayRollFadeOut");
    let postRollDelay = rollDelay + rollFadeIn + rollStay + rollFadeOut
    let postRollStay = getSetting("rollOverlayPostRollStay");
    let postRollFadeIn = getSetting("rollOverlayPostRollFadeIn");
    let postRollFadeOut = getSetting("rollOverlayPostRollFadeOut");


    let preRollImage = getSetting("rollOverlayPreRollImage")
    let rollBackgroundImage = getSetting("rollOverlayRollBackground")
    let rollForegroundImage = getSetting("rollOverlayRollForeground")
    let postRollImage = getSetting("rollOverlayPostRollImage")


    let rollValue = "0";

    let rollShow;

    let hook = Hooks.on('createChatMessage', (e) => {
        const uid = e.user.id;
        if (uid === playerId && e.whisper.length === 0) {
            rollValue = e.roll.result;
            rollShow = true;
        }
    })

    onDestroy(() => {
        Hooks.off('createChatMessage', hook);
    })

</script>

<div class="display-area" id={playerId}>
    {#if rollShow}
        {#if preRollImage}
            <img class="before layer" in:fade={{delay:preRollDelay,duration:preRollFadeIn}}
                 out:fade="{{delay:preRollStay,duration:preRollFadeOut}}" src={preRollImage} alt="pre roll image"/>
        {/if}
        {#if rollBackgroundImage}
            <img class="background layer" in:fade="{{delay:rollDelay,duration:rollFadeIn}}"
                 out:fade="{{delay:rollStay,duration:rollFadeOut}}" src={rollBackgroundImage} alt="roll image"/>
        {/if}
        <span class="roll layer" in:fade="{{delay:rollDelay,duration:rollFadeIn}}"
              out:fade="{{delay:rollStay,duration:rollFadeOut}}"
              on:introend={()=>rollShow=false}>{rollValue}</span>
        {#if rollForegroundImage}
            <img class="foreground layer" in:fade="{{delay:rollDelay,duration:rollFadeIn}}"
                 out:fade="{{delay:rollStay,duration:rollFadeOut}}" src={rollForegroundImage} alt="roll image"/>
        {/if}
        {#if postRollImage}
            <img class="after layer" in:fade="{{delay:postRollDelay,duration:postRollFadeIn}}"
                 out:fade="{{delay:postRollStay,duration:postRollFadeOut}}" src={postRollImage} alt="roll image"/>
        {/if}
    {/if}
</div>