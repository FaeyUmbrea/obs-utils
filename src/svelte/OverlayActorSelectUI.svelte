<script>
  import VirtualList from '@sveltejs/svelte-virtual-list';

  export let selectedActors;
  export let actors = [];

  let searchTerm = '';

  $: filteredActors = actors.filter((item) => item.name?.indexOf(searchTerm) !== -1);
</script>

<input bind:value={searchTerm} type="text" name="search" />

<VirtualList items={filteredActors} itemHeight={50} let:item>
  <div>
    <input
      value={item.id}
      type="checkbox"
      id={item.id}
      name={item.id}
      checked={item.id ? selectedActors.includes(item.id) : false}
    />
    <label for={item.id}
      ><img src={item.img} alt={item.name} />
      <p>{item.name}</p></label
    >
  </div>
</VirtualList>

<footer><button>Submit</button></footer>
