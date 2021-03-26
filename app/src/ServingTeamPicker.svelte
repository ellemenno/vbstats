<script>
  import { createEventDispatcher } from 'svelte';
  import { Button } from 'svelte-mui';

  import { TEAM } from './constants.js';
  import { logger } from './logger.js';

  const log = logger('serving team picker: ');
  const dispatch = createEventDispatcher();

  const emit_home = () => { dispatch('team_selected', { team: TEAM.HOME }); }
  const emit_away = () => { dispatch('team_selected', { team: TEAM.AWAY }); }
</script>

<style>
  .overlay {
    background-color: var(--overlay);
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 30;

    display: flex;
    justify-content: center;
    align-items: center;
  }
  .dialog {
    position: relative;
    font-size: 1rem;
    background: var(--bg-panel);
    border-radius: 4px;
    cursor: auto;
    box-shadow: 0 11px 15px -7px rgba(0, 0, 0, 0.2), 0 24px 38px 3px rgba(0, 0, 0, 0.14),
      0 9px 46px 8px rgba(0, 0, 0, 0.12);
    z-index: 40;
    max-height: 80%;
    overflow-x: hidden;
    overflow-y: auto;
  }

  div :global(.actions) {
    min-height: 48px;
    padding: 8px;
    display: flex;
    align-items: center;
  }
  div :global(.center) {
    justify-content: center;
  }
  div :global(.left) {
    justify-content: flex-start;
  }
  div :global(.right) {
    justify-content: flex-end;
  }

  .title {
    padding: 16px 16px 12px;
    font-size: 24px;
    line-height: 36px;
    background: var(--divider);
    margin: 0;
  }
</style>

<div class="overlay">
  <div class="dialog">
    <h3 class="title">Select serving team</h3>

    <div class="actions center">
      <Button color="var(--team-home-rgb)" on:click={emit_home}>◀ Home</Button> <!-- U+25C0 -->
      <Button color="var(--team-away-rgb)" on:click={emit_away}>Away ▶</Button> <!-- U+25B6 -->
    </div>
  </div>
</div>
