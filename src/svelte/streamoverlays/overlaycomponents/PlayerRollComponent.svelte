<script>
  import { fade } from "svelte/transition";
  import { rollOverlaySettings } from "../../../utils/settings.js";

  export let id;

  let pre = rollOverlaySettings.getStore("rollOverlayPostRollEnabled");
  let post = rollOverlaySettings.getStore("rollOverlayPreRollEnabled");

  let preRollDelay = rollOverlaySettings.getStore("rollOverlayPreRollDelay");
  let preRollStay = rollOverlaySettings.getStore("rollOverlayPreRollStay");
  let preRollFadeIn = rollOverlaySettings.getStore("rollOverlayPreRollFadeIn");
  let preRollFadeOut = rollOverlaySettings.getStore(
    "rollOverlayPreRollFadeOut",
  );
  let rollDelay = $pre
    ? $preRollDelay + $preRollFadeIn + $preRollStay + $preRollFadeOut
    : 0;
  let rollStay = rollOverlaySettings.getStore("rollOverlayRollStay");
  let rollFadeIn = rollOverlaySettings.getStore("rollOverlayRollFadeIn");
  let rollFadeOut = rollOverlaySettings.getStore("rollOverlayRollFadeOut");
  let postRollDelay = rollDelay + $rollFadeIn + $rollStay + $rollFadeOut;
  let postRollStay = rollOverlaySettings.getStore("rollOverlayPostRollStay");
  let postRollFadeIn = rollOverlaySettings.getStore(
    "rollOverlayPostRollFadeIn",
  );
  let postRollFadeOut = rollOverlaySettings.getStore(
    "rollOverlayPostRollFadeOut",
  );

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

  let preRollImage = rollOverlaySettings.getStore("rollOverlayPreRollImage");
  let rollBackgroundImage = rollOverlaySettings.getStore(
    "rollOverlayRollBackground",
  );
  let rollForegroundImage = rollOverlaySettings.getStore(
    "rollOverlayRollForeground",
  );
  let postRollImage = rollOverlaySettings.getStore("rollOverlayPostRollImage");

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
