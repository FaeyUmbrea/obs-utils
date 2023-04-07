<script>

    import {getSetting} from "../../../utils/settings.js";
    import {fade} from 'svelte/transition';


    export let playerId;

    let rollShow;
    let rollDelay = getSetting("rollOverlayRollDelay");
    let rollStay = getSetting("rollOverlayRollStay");
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
    {#if rollShow}
        <p in:fade="{{delay:rollDelay,duration:1}}" out:fade="{{delay:rollStay,duration:1}}">{rollValue}</p>
    {/if}
</div>