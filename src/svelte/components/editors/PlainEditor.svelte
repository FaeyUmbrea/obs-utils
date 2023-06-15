<style>
input {
    padding-left: 16px;
    background: transparent;
    border: none;
    height: 100%;
    width: 100%;
    font-size: 16px;
    font-family: inherit;
}

::placeholder {
    color: #7a8691;
}

.plain-editor {
    border: 1px solid #d8dbdf;
    border-radius: 6px;
    background: white;
}

.plain-editor:hover {
    border: 1px solid #b2b8bf;
}
</style>

<script>
  export let data;
</script>

<div class="plain-editor">
  <input bind:value="{data}" name="data" placeholder="Please enter" />
</div>
