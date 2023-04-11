<script>

    // This is to decouple the roll listener from the actual component

    import {onDestroy} from "svelte";
    import PlayerRollComponent from "./PlayerRollComponent.svelte";

    export let id;
    let rollShow = false;

    let rollValue
    let hook = Hooks.on('createChatMessage', (e) => {
        const uid = e.user.id;
        if (uid === id && e.whisper.length === 0) {
            rollValue = e.roll.result;
            rollShow = true;
        }
    })

    onDestroy(() => {
        Hooks.off('createChatMessage', hook);
    })
</script>
<PlayerRollComponent bind:rollShow bind:rollValue {id}/>