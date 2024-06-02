<script>
  import { fade } from "svelte/transition";
  import { getStore } from "../../../utils/settings.js";

  export let id;

  let pre = getStore("rollOverlayPostRollEnabled");
  let post = getStore("rollOverlayPreRollEnabled");

  let preRollDelay = getStore("rollOverlayPreRollDelay");
  let preRollStay = getStore("rollOverlayPreRollStay");
  let preRollFadeIn = getStore("rollOverlayPreRollFadeIn");
  let preRollFadeOut = getStore("rollOverlayPreRollFadeOut");
  let rollDelay = $pre
    ? $preRollDelay + $preRollFadeIn + $preRollStay + $preRollFadeOut
    : 0;
  let rollStay = getStore("rollOverlayRollStay");
  let rollFadeIn = getStore("rollOverlayRollFadeIn");
  let rollFadeOut = getStore("rollOverlayRollFadeOut");
  let postRollDelay = rollDelay + $rollFadeIn + $rollStay + $rollFadeOut;
  let postRollStay = getStore("rollOverlayPostRollStay");
  let postRollFadeIn = getStore("rollOverlayPostRollFadeIn");
  let postRollFadeOut = getStore("rollOverlayPostRollFadeOut");

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

  let preRollImage = getStore("rollOverlayPreRollImage");
  let rollBackgroundImage = getStore("rollOverlayRollBackground");
  let rollForegroundImage = getStore("rollOverlayRollForeground");
  let postRollImage = getStore("rollOverlayPostRollImage");

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
        on:introend="{() => (preRollShow = false)}"
      />
    {/if}
  {/if}
  {#if rollShow}
    {#if $rollBackgroundImage}
      <img
        class="background layer"
        in:fade="{{ delay: rollDelay, duration: $rollFadeIn }}"
        out:fade="{{ delay: $rollStay, duration: $rollFadeOut }}"
        src="{$rollBackgroundImage}"
        alt="roll background"
      />
    {/if}
    <span
      class="roll layer"
      in:fade="{{ delay: rollDelay, duration: $rollFadeIn }}"
      out:fade="{{ delay: $rollStay, duration: $rollFadeOut }}"
      on:introend="{() => (rollShow = false)}">{rollValue}</span
    >
    {#if $rollForegroundImage}
      <img
        class="foreground layer"
        in:fade="{{ delay: rollDelay, duration: $rollFadeIn }}"
        out:fade="{{ delay: $rollStay, duration: $rollFadeOut }}"
        src="{$rollForegroundImage}"
        alt="roll foreground"
      />
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
        alt="post roll"
      />
    {/if}
  {/if}
</div>
