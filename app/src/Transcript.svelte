<script>
  import { Button, Icon } from 'svelte-mui';

  import { TEAM, ACTION } from './constants.js';
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
      case ACTION.SERVICE_ERROR:
      case ACTION.RECEPTION_ERROR:
      case ACTION.PASSING_ERROR:
      case ACTION.ATTACKING_ERROR:
      case ACTION.BLOCKING_ERROR:
      case ACTION.VIOLATION:
        return 'var(--action-error-rgb)'
      break;

      case ACTION.ACE:
      case ACTION.BLOCK_KILL:
      case ACTION.KILL:
        return 'var(--action-point-rgb)'
      break;

      case ACTION.SERVE:
      case ACTION.DIG_OR_ATTACK:
      case ACTION.DIG:
      case ACTION.PASS_OR_ATTACK:
      case ACTION.PASS:
      case ACTION.BLOCK_OR_ATTACK:
      case ACTION.BLOCK:
      case ACTION.ATTACK:
        return (contact.team === TEAM.HOME) ? 'var(--team-home-rgb)' : 'var(--team-away-rgb)'
      break;

      default: return '#555';
    }
  }

  const symbol_for_action = (action) => {
    switch (action) {
      case ACTION.SERVICE_ERROR:
      case ACTION.RECEPTION_ERROR:
      case ACTION.PASSING_ERROR:
      case ACTION.ATTACKING_ERROR:
      case ACTION.BLOCKING_ERROR:
        return 'E';

      case ACTION.DIG_OR_ATTACK:
      case ACTION.PASS_OR_ATTACK:
      case ACTION.BLOCK_OR_ATTACK:
        return ' ';

      case ACTION.VIOLATION: return 'V';

      case ACTION.ACE:        return '♠'; // U+2660 Black Spade Suit (can't use U+FE0E in ::before)
      case ACTION.BLOCK:      return 'B';
      case ACTION.BLOCK_KILL: return 'ꓘ'; // U+A4D8 ꓘ LISU LETTER KHA
      case ACTION.KILL:       return 'K';
      case ACTION.SERVE:      return 'S';
      case ACTION.DIG:        return 'D';
      case ACTION.PASS:       return 'P';
      case ACTION.ATTACK:     return 'A';

      default: return '?';
    }
  }

  const style_for_symbol = (action) => {
    switch (action) {
      case ACTION.ACE: return 'font-size: x-large; margin-top: -0.15em; font-family: monospace';
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
    position: relative;
  }
  div.set-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 25%;
  }
  div.current.set {
    border-color: var(--bg-set-bar-rgb);
    border-bottom-style: none;
  }
  div.current.set-bg {
    background-color: var(--bg-set-bar-rgb);
  }
  div.home {
    border-color: var(--team-home-rgb);
    border-bottom-style: none;
  }
  div.home.set-bg {
    background-color: var(--team-home-rgb);
  }
  div.away {
    border-color: var(--team-away-rgb);
    border-bottom-style: none;
  }
  div.away.set-bg {
    background-color: var(--team-away-rgb);
  }
</style>

{#each Array($stored_match.sets.length).fill(0).map((v,i)=>i+1).reverse() as set_n}
{#if set_n-1 <= set_index && $stored_match.sets[set_n-1]}
<div class="{class_for_set($stored_match.sets[set_n-1])} set">
  <div class="{class_for_set($stored_match.sets[set_n-1])} set-bg"></div>
  <Button outlined dense icon color="white" title="Set {set_n}">{set_n}</Button>
  <span>
  {#each $stored_match.sets[set_n-1].rallies as rally}
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
