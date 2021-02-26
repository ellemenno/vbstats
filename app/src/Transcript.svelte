<script>
  import { Button, Icon } from 'svelte-mui';

  import { TEAM, ACTION } from './stores.js';
  import { match as stored_match } from './stores.js';
  import { logger } from './logger.js';

/*
  const TEAM = { HOME:'home', AWAY:'away' }

  const ACTION = {
    SERVE:'serve', ACE:'ace', SERVICE_ERROR:'service error',
    DIG_OR_ATTACK:'dig_or_attack', DIG:'dig', RECEPTION_ERROR:'reception error',
    PASS_OR_ATTACK:'pass_or_attack', PASS:'pass', PASSING_ERROR:'passing error',
    ATTACK:'attack', KILL:'kill', ATTACKING_ERROR:'attacking error',
    BLOCK_OR_ATTACK:'block_or_attack', BLOCK:'block', BLOCKING_ERROR:'blocking error',
    VIOLATION:'violation',
  }

contact:
 .type
 .player
 .team
 .description
 .action
 .area_id
 .court_x
 .court_y
*/
  const log = logger('transcript: ');

  const class_for_set = (set) => {
    switch (set.winner) {
      case 'home': return 'home-set';
      case 'away': return 'away-set';
      default: return 'current-set';
    }
  }

  const title_for_contact = (contact) => {
    let t = contact.description;
    if (contact.player) { t = `${contact.player} ${t}` }
    return t;
  }

  const color_for_contact = (contact) => {
    switch (contact.action) {
      case $ACTION.SERVICE_ERROR:
      case $ACTION.RECEPTION_ERROR:
      case $ACTION.PASSING_ERROR:
      case $ACTION.ATTACKING_ERROR:
      case $ACTION.BLOCKING_ERROR:
      case $ACTION.VIOLATION:
        return '#d80073'
      break;

      case $ACTION.ACE:
      case $ACTION.BLOCK:
      case $ACTION.KILL:
        return '#60a917'
      break;

      case $ACTION.SERVE:
      case $ACTION.DIG_OR_ATTACK:
      case $ACTION.DIG:
      case $ACTION.PASS_OR_ATTACK:
      case $ACTION.PASS:
      case $ACTION.BLOCK_OR_ATTACK:
      case $ACTION.BLOCK:
      case $ACTION.ATTACK:
        return (contact.team === $TEAM.HOME) ? '#1ba1e2' : '#f0a30a'
      break;

      default: return '#555';
    }
  }

  const symbol_for_action = (action) => {
    switch (action) {
      case $ACTION.SERVICE_ERROR:
      case $ACTION.RECEPTION_ERROR:
      case $ACTION.PASSING_ERROR:
      case $ACTION.ATTACKING_ERROR:
      case $ACTION.BLOCKING_ERROR:
        return 'E';

      case $ACTION.DIG_OR_ATTACK:
      case $ACTION.PASS_OR_ATTACK:
      case $ACTION.BLOCK_OR_ATTACK:
        return ' ';

      case $ACTION.VIOLATION: return 'V';

      case $ACTION.ACE:    return '♠';
      case $ACTION.BLOCK:  return 'B';
      case $ACTION.KILL:   return 'K';
      case $ACTION.SERVE:  return 'S';
      case $ACTION.DIG:    return 'D';
      case $ACTION.PASS:   return 'P';
      case $ACTION.ATTACK: return 'A';

      default: return '?';
    }
  }

  const style_for_symbol = (action) => {
    switch (action) {
      case $ACTION.ACE: return 'font-size: x-large; margin-top: -0.15em';
      default: return '';
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

{#each $stored_match as set, i}
<div class="{class_for_set(set)}">
  <Button outlined dense icon color="white" title="Set {i+1}">{i+1}</Button>
  <span>
  {#each set.rallies as rally}
  {#each rally.contacts as c}
    <Button unelevated dense icon
            title="{title_for_contact(c)}"
            color="{color_for_contact(c)}"
            style="{style_for_symbol(c.action)}">
      {symbol_for_action(c.action)}
    </Button>
  {/each}
  {/each}
  </span>
</div>
{/each}
