<script>
  import { createEventDispatcher } from 'svelte';
  import { Dialog, Button } from 'svelte-mui';

  import { TEAM } from './constants.js';
  import { logger } from './logger.js';

  export let visible = false;

  const log = logger('serving team picker: ');
  const dispatch = createEventDispatcher();

  const emit_home = () => { dispatch('team_selected', { team: TEAM.HOME }); }
  const emit_away = () => { dispatch('team_selected', { team: TEAM.AWAY }); }
</script>

<style>
</style>

<Dialog width="auto" bind:visible>
  <div slot="title">Select serving team</div>

  <div slot="actions" class="actions center">
    <Button color="var(--team-home-rgb)" on:click={emit_home}>Home</Button>
    <Button color="var(--team-away-rgb)" on:click={emit_away}>Away</Button>
  </div>
</Dialog>
