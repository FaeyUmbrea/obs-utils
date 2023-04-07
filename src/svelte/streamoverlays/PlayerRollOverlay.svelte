<script>
    import PlayerRollComponent from "./overlaycomponents/PlayerRollComponent.svelte";

    let players = game.users.filter((e) => e.id !== game.user.id)
</script>

<div class="obs-utils roll-overlay">
    {#each players as player}
        <PlayerRollComponent playerId={player.id}/>
    {/each}
</div>