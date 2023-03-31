<script>

  export let websocketSettings;
</script>

<hr />
<div class="flexcol">
  URL: <input name="url" type="text" bind:value={websocketSettings.url} />
  <br />
  Port: <input name="port" type="number" bind:value={websocketSettings.port} />
  <br />
  Password: <input name="password" type="password" bind:value={websocketSettings.password} />
  <p style="color:red">This password is NOT stored securely</p>
  <hr />
  <button type="submit">Save</button>
</div>
<hr />
