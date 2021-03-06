<script>
  import { Ripple } from 'svelte-mui';

  export let data;

  const comparator = ({key, dir}) => (
    (a, b) => {
      if (a[key] < b[key]) return -1 * dir;
      if (a[key] > b[key]) return  1 * dir;
                           return  0;
    }
  )

  $: criteria = { key: (data && data[0] && Object.keys(data[0])[0]) || '', dir: 1 };

  $: sort = (key) => {
    if (key === criteria.key) { criteria.dir *= -1; }
    else {
      criteria.key = key;
      criteria.dir = 1;
    }

    data = data.sort(comparator(criteria));
  }
</script>

<style>
  table {
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
  }
  thead tr {
    background: var(--bg-panel);
    cursor: pointer;
    font-weight: 500;
    user-select: none;
  }
  th.active {
    color: var(--accent)
  }
  td, th {
    border: 1px solid var(--border);
    padding: 0.5em;
    text-align: left;
    vertical-align: middle;
  }
</style>

{#if data && data[0]}
<table>
  <thead>
    <tr>
      {#each Object.keys(data[0]) as key}
      <th class:active={(key === criteria.key)} on:click={sort(key)}>{key} <Ripple/></th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each data as row}
    <tr>
      {#each Object.values(row) as val}
      <td>{val}</td>
      {/each}
    </tr>
    {/each}
  </tbody>
</table>
{/if}