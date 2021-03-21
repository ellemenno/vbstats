<script>
  import { onMount } from 'svelte';
  import { Dialog, Button, ButtonGroup } from 'svelte-mui';

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
</style>

<Dialog width="auto" bind:visible>
  <div slot="title">Select player jerseys ({jerseys.length})</div>

  <table>
    {#each (new Array(10).fill(0)) as _,r }
    <tr>
    {#each (new Array(10).fill(0)) as _,c }
    <td><Button color="var(--alternate)"
                dense fullWidth toggle
                active={numbers[r*10+c]}
                on:click={()=>on_num_clicked(r*10+c)}>{r*10+c}
      </Button></td>
    {/each}
    </tr>
    {/each}
  </table>

  <div slot="actions" class="actions center">
    <Button color="primary" on:click={()=>on_clear()}>Clear</Button>
    <Button color="primary" on:click={()=>visible=false}>Done</Button>
  </div>
</Dialog>
