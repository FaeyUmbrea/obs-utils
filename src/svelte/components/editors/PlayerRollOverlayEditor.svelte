<script>
    import {rollOverlaySettings as settings} from "../../../utils/settings.js";
    import PlayerRollComponent from "../../streamoverlays/overlaycomponents/PlayerRollComponent.svelte";
    import {ApplicationShell} from "@typhonjs-fvtt/runtime/svelte/component/core";
    import {TJSSettingsEdit} from "@typhonjs-fvtt/svelte-standard/component";
    import {getContext} from "svelte";

    let preRollDelay = settings.getStore("rollOverlayPreRollDelay");
    let preRollStay = settings.getStore("rollOverlayPreRollStay");
    let preRollFadeIn = settings.getStore("rollOverlayPreRollFadeIn");
    let preRollFadeOut = settings.getStore("rollOverlayPreRollFadeOut");
    let rollDelay = preRollDelay + preRollFadeIn + preRollStay + preRollFadeOut;
    let rollStay = settings.getStore("rollOverlayRollStay");
    let rollFadeIn = settings.getStore("rollOverlayRollFadeIn");
    let rollFadeOut = settings.getStore("rollOverlayRollFadeOut");
    let postRollDelay = rollDelay + rollFadeIn + rollStay + rollFadeOut
    let postRollStay = settings.getStore("rollOverlayPostRollStay");
    let postRollFadeIn = settings.getStore("rollOverlayPostRollFadeIn");
    let postRollFadeOut = settings.getStore("rollOverlayPostRollFadeOut");


    let preRollImage = settings.getStore("rollOverlayPreRollImage")
    let rollBackgroundImage = settings.getStore("rollOverlayRollBackground")
    let rollForegroundImage = settings.getStore("rollOverlayRollForeground")
    let postRollImage = settings.getStore("rollOverlayPostRollImage")

    let pre;

    let rollValue = "20";
    let rollShow = true;

    const {application} = getContext('#external');

    export let elementRoot = void 0;
</script>

<svelte:options accessors={true}/>
<ApplicationShell bind:elementRoot>
    <div class="editor">
        <section class="preview">
            <PlayerRollComponent bind:rollShow bind:rollValue id="preview"/>
        </section>
        <section class="menu">
            <TJSSettingsEdit options={{ storage: application.reactive.sessionStorage }} settings={settings}/>
        </section>
    </div>
</ApplicationShell>

<style lang="stylus">
  .editor
    display grid

    .preview
      grid-column-start 1

    .menu
      grid-column-start 2
      display grid
</style>