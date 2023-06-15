<script>
  import { rollOverlaySettings as settings } from "../../../utils/settings.js";
  import { fade } from "svelte/transition";

  export let id;

  let pre = settings.getStore("rollOverlayPostRollEnabled");
  let post = settings.getStore("rollOverlayPreRollEnabled");

  let preRollDelay = settings.getStore("rollOverlayPreRollDelay");
  let preRollStay = settings.getStore("rollOverlayPreRollStay");
  let preRollFadeIn = settings.getStore("rollOverlayPreRollFadeIn");
  let preRollFadeOut = settings.getStore("rollOverlayPreRollFadeOut");
  let rollDelay = $pre
    ? $preRollDelay + $preRollFadeIn + $preRollStay + $preRollFadeOut
    : 0;
  let rollStay = settings.getStore("rollOverlayRollStay");
  let rollFadeIn = settings.getStore("rollOverlayRollFadeIn");
  let rollFadeOut = settings.getStore("rollOverlayRollFadeOut");
  let postRollDelay = rollDelay + $rollFadeIn + $rollStay + $rollFadeOut;
  let postRollStay = settings.getStore("rollOverlayPostRollStay");
  let postRollFadeIn = settings.getStore("rollOverlayPostRollFadeIn");
  let postRollFadeOut = settings.getStore("rollOverlayPostRollFadeOut");

  function recalculateRollDelay() {
    rollDelay = $pre
      ? $preRollDelay + $preRollFadeIn + $preRollStay + $preRollFadeOut
      : 0;
  }

  preRollDelay.subscribe(recalculateRollDelay);
  preRollFadeIn.subscribe(recalculateRollDelay);
  preRollStay.subscribe(recalculateRollDelay);
  preRollFadeOut.subscribe(recalculateRollDelay);
  pre.subscribe(recalculateRollDelay);

  function recalculatePostRollDelay() {
    postRollDelay = rollDelay + $rollFadeIn + $rollStay + $rollFadeOut;
  }

  rollFadeIn.subscribe(recalculatePostRollDelay);
  rollStay.subscribe(recalculatePostRollDelay);
  rollFadeOut.subscribe(recalculatePostRollDelay);

  let preRollImage = settings.getStore("rollOverlayPreRollImage");
  let rollBackgroundImage = settings.getStore("rollOverlayRollBackground");
  let rollForegroundImage = settings.getStore("rollOverlayRollForeground");
  let postRollImage = settings.getStore("rollOverlayPostRollImage");

  export let rollValue = "0";
  export let preRollShow = false;
  export let rollShow = false;
  export let postRollShow = false;
</script>

<div class="display-area" id="{id}">
  {#if preRollShow}
    {#if $pre}
      <img
        class="before layer"
        in:fade="{{ delay: $preRollDelay, duration: $preRollFadeIn }}"
        out:fade="{{ delay: $preRollStay, duration: $preRollFadeOut }}"
        src="{$preRollImage}"
        alt="pre roll"
        on:introend="{() => (preRollShow = false)}" />
    {/if}
  {/if}
  {#if rollShow}
    {#if $rollBackgroundImage}
      <img
        class="background layer"
        in:fade="{{ delay: rollDelay, duration: $rollFadeIn }}"
        out:fade="{{ delay: $rollStay, duration: $rollFadeOut }}"
        src="{$rollBackgroundImage}"
        alt="roll background" />
    {/if}
    <span
      class="roll layer"
      in:fade="{{ delay: rollDelay, duration: $rollFadeIn }}"
      out:fade="{{ delay: $rollStay, duration: $rollFadeOut }}"
      on:introend="{() => (rollShow = false)}">{rollValue}</span>
    {#if $rollForegroundImage}
      <img
        class="foreground layer"
        in:fade="{{ delay: rollDelay, duration: $rollFadeIn }}"
        out:fade="{{ delay: $rollStay, duration: $rollFadeOut }}"
        src="{$rollForegroundImage}"
        alt="roll foreground" />
    {/if}
  {/if}
  {#if postRollShow}
    {#if $post && $postRollImage}
      <img
        class="after layer"
        in:fade="{{ delay: postRollDelay, duration: $postRollFadeIn }}"
        out:fade="{{ delay: $postRollStay, duration: $postRollFadeOut }}"
        src="{$postRollImage}"
        on:introend="{() => (postRollShow = false)}"
        alt="post roll" />
    {/if}
  {/if}
</div>
