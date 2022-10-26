<script lang="ts">
    import type { OBSWebsocketSettings } from "src/utils/settings";


    export let websocketSettings: OBSWebsocketSettings;
</script>

<div class="flex">
    URL: <input name="url" type="url" bind:value={websocketSettings.url} />
    <br>
    Port: <input name="port" type="number" bind:value={websocketSettings.port} />
    <br>
    Password: <input name="password" type="password" bind:value={websocketSettings.password} />
    <br>
    <button type="submit">Save</button>
</div>