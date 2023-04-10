<script>

    import {getSetting} from "../../../utils/settings.js";
    import {fade} from 'svelte/transition';


    export let playerId;

    let rollShow;
    let preRollShow;
    let rollDelay = getSetting("rollOverlayRollDelay");
    let rollStay = getSetting("rollOverlayRollStay");
    let rollFadeIn = getSetting("rollOverlayRollFadeIn");
    let rollFadeOut = getSetting("rollOverlayRollFadeOut");

    let rollValue = "0";

    Hooks.on('createChatMessage', (e) => {
        const uid = e.user.id;
        if (uid === playerId && e.whisper.length === 0) {
            rollValue = e.roll.result;
            rollShow = true;
        }
    })
    
</script>

<div class="display-area" id={playerId}>
    {#if preRollShow}

    {/if}
    {#if rollShow}
        <span in:fade="{{delay:rollDelay,duration:rollFadeIn}}" out:fade="{{delay:rollStay,duration:rollFadeOut}}"
              on:introend={()=>rollShow=false}>{rollValue}</span>
    {/if}
</div>