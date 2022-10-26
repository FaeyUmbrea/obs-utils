<script lang="ts">
  import { OBSAction, type OBSEvent } from '../../utils/settings';
    import { fade } from 'svelte/transition';

    export let removeFn: any;
    export let event: OBSEvent;
    export let useWebSocket: boolean;

    let idDisabled: boolean = true;
    let sceneDisabled: boolean = false;

    let actionTypes = Object.keys(OBSAction);
   
    function changeEvent(){
        if(event.targetAction == OBSAction.SwitchScene){
            idDisabled = true;
        }
        else{
            idDisabled = false;
        }
        if(!useWebSocket){
            switch(event.targetAction){
                case OBSAction.SwitchScene:
                    sceneDisabled = true;
                    idDisabled = true;
                    break;
                default:
                    sceneDisabled = false;
                    break;
            }
        }
        else{
            sceneDisabled = false;
        }
    }
    
</script>

<li transition:fade>
    <div>
        <select name="types" bind:value={event.targetAction} on:change={changeEvent}>
            {#each actionTypes as action}
                <option value={action}>{action}</option>
            {/each}
        </select>
        <input name="sceneNames" bind:value={event.sceneName} disabled={sceneDisabled} />
        <input name="itemIDs" bind:value={event.targetName} disabled={idDisabled} />
        <button type="button" on:click={removeFn}>
            x
        </button>
    </div>
</li>