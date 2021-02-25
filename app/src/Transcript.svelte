<script>
  import { Button, Icon } from 'svelte-mui';

  export let actions = ['E','V', '♠','B','K', ' ','S','D','P','A','1'];

  const color_for_action = (a) => {
    switch (a) {
      case 'E':
      case 'V':
        return '#d80073'
      break;

      case '♠':
      case 'B':
      case 'K':
        return '#60a917'
      break;

      case ' ':
      case 'S':
      case 'D':
      case 'P':
      case 'A':
      case '1':
        return Math.random() >= 0.5 ? '#1ba1e2' : '#f0a30a'
      break;
    }
  }

  const title_for_action = (a) => {
    switch (a) {
      case 'E': return 'error';
      case 'V': return 'violation';
      case '♠': return 'ace';
      case 'B': return 'block';
      case 'K': return 'kill';
      case ' ': return 'pending resolution';
      case 'S': return 'serve';
      case 'D': return 'dig';
      case 'P': return 'pass';
      case 'A': return 'attack';
      case '1': return 'point';
    }
  }
</script>

<style>
  div {
    border-radius: 0.1em;
    border-style: solid;
    border-width: 1px;
    padding: 0.25em;
  }
  div.current-set {
    background-color: #ffffff80;
    border-color: #ffffff;
    border-bottom-style: none;
  }
  div.home-set {
    background-color: #1ba1e280;
    border-color: #1ba1e2;
    border-bottom-style: none;
  }
  div.away-set {
    background-color: #f0a30a80;
    border-color: #f0a30a;
    border-bottom-style: none;
  }
</style>

<div class="home-set">
  <Button outlined dense icon color="white" title="Set 1">1</Button>
  <span>
  {#each actions as a}
    <Button unelevated dense icon color="{color_for_action(a)}" title="{title_for_action(a)}">{a}</Button>
  {/each}
  {#each actions as a}
    <Button unelevated dense icon color="{color_for_action(a)}" title="{title_for_action(a)}">{a}</Button>
  {/each}
  {#each actions as a}
    <Button unelevated dense icon color="{color_for_action(a)}" title="{title_for_action(a)}">{a}</Button>
  {/each}
  </span>
</div>
<div class="away-set">
  <Button outlined dense icon color="white" title="Set 2">2</Button>
  <span>
  {#each actions as a}
    <Button unelevated dense icon color="{color_for_action(a)}" title="{title_for_action(a)}">{a}</Button>
  {/each}
  </span>
</div>
<div class="current-set">
  <Button outlined dense icon color="white" title="Set 3">3</Button>
  <span>
  {#each actions as a}
    <Button unelevated dense icon color="{color_for_action(a)}" title="{title_for_action(a)}">{a}</Button>
  {/each}
  </span>
</div>