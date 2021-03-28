<script>
  import { onMount } from 'svelte';
  import { Dialog, Button } from 'svelte-mui';

  import { logger } from './logger.js';

  export let jerseys = [];
  export let visible = false;

  const log = logger('jersey picker: ');
  const numbers = new Array(100).fill(false);

  const on_clear = () => {
    log.debug('clearing numbers...');
    numbers.forEach( (v,i) => numbers[i] = false );
    jerseys = [];
  }

  const on_num_clicked = (n) => {
    numbers[n] = !numbers[n];
    jerseys = numbers.reduce( (a,v,i) => v ? a.concat(i) : a, [] );
    log.debug(`clicked ${n}, jersey ${numbers[n] ? '' : 'de-'}selected`);
  }

  onMount(async () => {
    jerseys.forEach(n => numbers[n] = true);
  });
</script>

<style>
  .numbers {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(2rem, 2rem));
    grid-gap: 0.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>

<Dialog bind:visible>
  <div slot="title">Select player jerseys ({jerseys.length})</div>

  <ul class="numbers">
    {#each (new Array(100).fill(0)) as _,i }
    <li><Button color="var(--alternate)"
                dense fullWidth toggle
                active={numbers[i]}
                on:click={()=>on_num_clicked(i)}>{i}
      </Button></li>
    {/each}
  </ul>

  <div slot="actions" class="actions center">
    <Button color="primary" on:click={()=>on_clear()}>Clear</Button>
    <Button color="primary" on:click={()=>visible=false}>Done</Button>
  </div>
</Dialog>
