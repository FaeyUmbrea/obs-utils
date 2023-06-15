<svelte:options accessors="{true}" />

<style lang="stylus">
  .editor
    display grid
    grid-template-rows 2fr 1fr

    .preview
      grid-row-start 1
      background black
      border-radius 5px
      color white
      margin unset
      padding unset
      position relative

      button
        position absolute
        bottom 1px
        left 0
        width 40px
        background black
        color white
        border-color darkgray

    .menu
      grid-row-start 2
      display grid
      grid-template-columns 1fr 1fr 1fr

      // Text Inputs with 35px wide button on the right side

      .filepicker
        display flex

        button
          width 35px

      div
        border-left 2px solid grey
        border-right 2px solid grey
        border-bottom 2px solid grey
        border-radius 6px
        margin 2px

        .header
          display flex
          height 30px
          align-items center
          background lightgray
          border-bottom 1px solid gray
          border-top 2px solid gray
          border-top-left-radius 6px
          border-top-right-radius 6px


        .content
          margin 2px

      .pre
        grid-column-start 1

      .roll
        grid-column-start 2

      .post
        grid-column-start 3
</style>

<script>
  import { rollOverlaySettings as settings } from "../../../utils/settings.js";
  import PlayerRollComponent from "../../streamoverlays/overlaycomponents/PlayerRollComponent.svelte";
  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";

  let preRollDelay = settings.getStore("rollOverlayPreRollDelay");
  let preRollStay = settings.getStore("rollOverlayPreRollStay");
  let preRollFadeIn = settings.getStore("rollOverlayPreRollFadeIn");
  let preRollFadeOut = settings.getStore("rollOverlayPreRollFadeOut");
  let rollStay = settings.getStore("rollOverlayRollStay");
  let rollFadeIn = settings.getStore("rollOverlayRollFadeIn");
  let rollFadeOut = settings.getStore("rollOverlayRollFadeOut");
  let postRollStay = settings.getStore("rollOverlayPostRollStay");
  let postRollFadeIn = settings.getStore("rollOverlayPostRollFadeIn");
  let postRollFadeOut = settings.getStore("rollOverlayPostRollFadeOut");

  let preRollImage = settings.getStore("rollOverlayPreRollImage");
  let rollBackgroundImage = settings.getStore("rollOverlayRollBackground");
  let rollForegroundImage = settings.getStore("rollOverlayRollForeground");
  let postRollImage = settings.getStore("rollOverlayPostRollImage");

  let pre = settings.getStore("rollOverlayPostRollEnabled");
  let post = settings.getStore("rollOverlayPreRollEnabled");

  let rollValue = "20";
  let rollShow = false;

  export let elementRoot = void 0;

  function test() {
    rollValue = Math.round(Math.random() * 20);
    rollShow = false;
    rollShow = true;
  }

  let filePickerAppPreRoll;

  function openFilePickerPreRoll() {
    if (filePickerAppPreRoll) {
      filePickerAppPreRoll.bringToTop();
    } else {
      filePickerAppPreRoll = new FilePicker({
        type: "image",
        callback: (path) => {
          $preRollImage = path;
          filePickerAppPreRoll = null;
        },
        title: "Select an Image"
      }).render(true);
    }
  }

  let filePickerAppForeground;

  function openFilePickerForeground() {
    if (filePickerAppForeground) {
      filePickerAppForeground.bringToTop();
    } else {
      filePickerAppForeground = new FilePicker({
        type: "image",
        callback: (path) => {
          $rollForegroundImage = path;
          filePickerAppForeground = null;
        },
        title: "Select an Image"
      }).render(true);
    }
  }

  let filePickerAppBackground;

  function openFilePickerBackground() {
    if (filePickerAppBackground) {
      filePickerAppBackground.bringToTop();
      filePickerAppBackground = null;
    } else {
      filePickerAppBackground = new FilePicker({
        type: "image",
        callback: (path) => {
          $rollBackgroundImage = path;
        },
        title: "Select an Image"
      }).render(true);
    }
  }

  let filePickerAppPostRoll;

  function openFilePickerPostRoll() {
    if (filePickerAppPostRoll) {
      filePickerAppPostRoll.bringToTop();
      filePickerAppPostRoll = null;
    } else {
      filePickerAppPostRoll = new FilePicker({
        type: "image",
        callback: (path) => {
          $postRollImage = path;
        },
        title: "Select an Image"
      }).render(true);
    }
  }
</script>

<ApplicationShell bind:elementRoot="{elementRoot}">
  <div class="editor">
    <section class="preview obs-utils roll-overlay">
      <PlayerRollComponent
        bind:rollValue="{rollValue}"
        id="preview"
        postRollShow="{rollShow}"
        preRollShow="{rollShow}"
        rollShow="{rollShow}" />
      <button on:click="{test}">Test</button>
    </section>
    <section class="menu">
      <div class="pre">
        <section class="header">
          <input bind:checked="{$pre}" type="checkbox" />

          <span>Pre Roll Image</span>
        </section>
        <section class="content">
          Image URL
          <section class="filepicker">
            <input bind:value="{$preRollImage}" type="text" />
            <button on:click="{openFilePickerPreRoll}"
            ><i class="fa-solid fa-file"></i></button>
          </section>
          Delay (ms)
          <input bind:value="{$preRollDelay}" min="0" type="number" />
          Fade In (ms)
          <input bind:value="{$preRollFadeIn}" min="0" type="number" />
          Duration (ms)
          <input bind:value="{$preRollStay}" min="0" type="number" />
          Fade Out (ms)
          <input bind:value="{$preRollFadeOut}" min="0" type="number" />
        </section>
      </div>
      <div class="roll">
        <section class="header">
          <span>Roll</span>
        </section>
        <section class="content">
          Foreground Image URL
          <section class="filepicker">
            <input bind:value="{$rollForegroundImage}" type="text" />
            <button on:click="{openFilePickerForeground}"
            ><i class="fa-solid fa-file"></i></button>
          </section>
          Background Image URL
          <section class="filepicker">
            <input bind:value="{$rollBackgroundImage}" type="text" />
            <button on:click="{openFilePickerBackground}"
            ><i class="fa-solid fa-file"></i></button>
          </section>
          Fade In (ms)
          <input bind:value="{$rollFadeIn}" min="0" type="number" />
          Duration (ms)
          <input bind:value="{$rollStay}" min="0" type="number" />
          Fade Out (ms)
          <input bind:value="{$rollFadeOut}" min="0" type="number" />
        </section>
      </div>
      <div class="post">
        <section class="header">
          <input bind:checked="{$post}" type="checkbox" />
          <span>Post Roll Image</span>
        </section>
        <section class="content">
          Image URL
          <section class="filepicker">
            <input bind:value="{$postRollImage}" type="text" />
            <button on:click="{openFilePickerPostRoll}"
            ><i class="fa-solid fa-file"></i></button>
          </section>
          Fade In (ms)
          <input bind:value="{$postRollFadeIn}" min="0" type="number" />
          Duration (ms)
          <input bind:value="{$postRollStay}" min="0" type="number" />
          Fade Out (ms)
          <input bind:value="{$postRollFadeOut}" min="0" type="number" />
        </section>
      </div>
    </section>
  </div>
</ApplicationShell>
