<script>
  import { Button, Icon } from 'svelte-mui';

  import { TEAM, ACTION } from './stores.js';
  import { match as stored_match } from './stores.js';
  import { logger } from './logger.js';

  export let set_index = 0;

  const log = logger('transcript: ');

  const class_for_set = (set) => {
    switch (set.winner) {
      case 'home': return 'home';
      case 'away': return 'away';
      default: return 'current';
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
        return 'rgb(var(--action-error-rgb))'
      break;

      case $ACTION.ACE:
      case $ACTION.BLOCK_KILL:
      case $ACTION.KILL:
        return 'rgb(var(--action-point-rgb))'
      break;

      case $ACTION.SERVE:
      case $ACTION.DIG_OR_ATTACK:
      case $ACTION.DIG:
      case $ACTION.PASS_OR_ATTACK:
      case $ACTION.PASS:
      case $ACTION.BLOCK_OR_ATTACK:
      case $ACTION.BLOCK:
      case $ACTION.ATTACK:
        return (contact.team === $TEAM.HOME) ? 'rgb(var(--team-home-rgb))' : 'rgb(var(--team-away-rgb))'
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

      case $ACTION.ACE:        return '♠'; // U+2660 Black Spade Suit
      case $ACTION.BLOCK:      return 'B';
      case $ACTION.BLOCK_KILL: return 'ꓘ'; // U+A4D8 ꓘ LISU LETTER KHA
      case $ACTION.KILL:       return 'K';
      case $ACTION.SERVE:      return 'S';
      case $ACTION.DIG:        return 'D';
      case $ACTION.PASS:       return 'P';
      case $ACTION.ATTACK:     return 'A';

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
  div.set {
    border-radius: 0.1em;
    border-style: solid;
    border-width: 1px;
    padding: 0.25em;
  }
  div.current {
    background-color: rgba(var(--bg-set-bar-rgb), 0.25);
    border-color: rgb(var(--bg-set-bar-rgb));
    border-bottom-style: none;
  }
  div.home {
    background-color: rgba(var(--team-home-rgb), 0.25);
    border-color: rgb(var(--team-home-rgb));
    border-bottom-style: none;
  }
  div.away {
    background-color: rgba(var(--team-away-rgb), 0.25);
    border-color: rgb(var(--team-away-rgb));
    border-bottom-style: none;
  }
</style>

{#each $stored_match as set, i}
{#if i <= set_index}
<div class="{class_for_set(set)} set">
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
{/if}
{/each}
