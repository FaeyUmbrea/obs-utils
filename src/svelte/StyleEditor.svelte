<script>
  import Select from "svelte-select";

  export let style;

  const items = ["a", "b"]
</script>

<input type="text" name="style" value={style} />
<footer>
  <button class="submit" type="submit">Submit</button>
</footer>