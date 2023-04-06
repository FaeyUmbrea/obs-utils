<script>
    import {getActorValues} from '../../../utils/helpers';

    import Select from 'svelte-select';

    export let data;
    let values = getActorValues();
    let items = [...values]

    let filterText = '';

    async function getSvelecte() {
        return (await import('svelecte')).default;
    }

    function handleFilter(e) {
        if (e.detail.length === 0 && filterText.length > 0) {
            items = [...values, filterText]
        }
    }
</script>

<Select --height="30px" bind:filterText bind:justValue={data} closeListOnChange="false" floatingConfig={{
            strategy: 'fixed',
        }} {items}
        on:filter={handleFilter} value={data}/>

