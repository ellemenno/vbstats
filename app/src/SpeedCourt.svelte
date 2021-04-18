<script>
  import { createEventDispatcher } from 'svelte';
  import { Button } from 'svelte-mui';

  import { TEAM, CONTACT } from './constants.js';
  import { logger } from './logger.js';

  export let is_serve = false;
  export let serving_team;
  export let receiving_team;
  export let home_jerseys = [];

  const log = logger('speed court: ');
  const floor_contacts = ['in', 'out'];
  const dispatch = createEventDispatcher();

  $: state_for_team = (team) => {
    if (team === serving_team) return 'serving';
    if (team === receiving_team) return 'receiving';
    return '';
  }

  const emit_contact = (area_id, type, player=null) => {
    const contact = {
      is_speedy: true,
      area_id: area_id,
      type: type,
    }
    if (player) { contact.player = player; }
    dispatch('contact', contact);
  }

  const on_player = (p, at_net=false) => {
    log.debug(`player #${p} contact on home court${at_net ? ' at net' : ''}`);
    const area_id = is_serve ? 'free-home-service' : (at_net ? 'block-home' : 'court-home');
    emit_contact(area_id, CONTACT.PLAYER, p);
  }

  const on_touches = (t, at_net=false) => {
    log.debug(`${t} touches on away court${at_net ? ' at net' : ''}`);
    if (t === 1 && is_serve) { emit_contact('free-away-service', CONTACT.PLAYER, 'Player'); }
    else {
      const area_id = at_net ? 'block-away' : 'court-away';
      for (let i = 0; i < t; i++) { emit_contact(area_id, CONTACT.PLAYER, 'Player'); }
    }
  }

  const on_floor = (team, type) => {
    log.debug(`floor contact (${type}) on ${team} side`);
    const area_id = (type === 'out') ? `free-${team}` : `court-${team}`;
    emit_contact(area_id, CONTACT.FLOOR);
  }

  const on_net = () => {
    log.debug(`net contact`);
    emit_contact('net-area', CONTACT.NET);
  }
</script>

<style>
  .container {
    display: grid;
    grid-template-columns: 4fr 3em 4fr;
  }
  .fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
  }
  .indicator {
    position: absolute;
    top: 0;
    left: 0;
    padding: 1em;
    font-size: larger;
    width: 100%;
  }
  .indicator.serving {
    background-color: #ffffff40;
  }
  .indicator.receiving {
    color: var(--label);
  }
  .away, .home {
    padding: 5em 0.7em 0.7em 0.7em;
    position: relative;
  }
  .away .fill {
    background-color: var(--team-away-rgb);
    opacity: 60%;
  }
  .home .fill {
    background-color: var(--team-home-rgb);
    opacity: 60%;
  }
  .net {
    background-color: white;
    color: var(--border);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    font-family: var(--button-font-family);
    font-size: 0.875rem;
    font-weight: 500;
    justify-content: center;
    letter-spacing: 0.75px;
    text-align: center;
    text-decoration: none;
    text-transform: uppercase;
  }
  .floor {
    grid-template-columns: repeat(auto-fit, minmax(6em, 8em));
  }
  .players, .touches {
    grid-template-columns: repeat(auto-fit, minmax(2rem, 2rem));
  }
  .floor, .players, .touches {
    display: grid;
    grid-gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>

<div class="container">
  <div class="home">
    <div class="fill" />
    <div class="indicator" class:serving={serving_team === TEAM.HOME} class:receiving={receiving_team === TEAM.HOME}>{state_for_team(TEAM.HOME)}</div>
    floor
    <ul class="floor">
      {#each floor_contacts as f }
      <li><Button color="var(--alternate)"
              dense fullWidth outlined
              on:click={()=>on_floor(TEAM.HOME, f)}>{f}
      </Button></li>
      {/each}
    </ul>
    <br>
    players
    <ul class="players">
      {#each home_jerseys as j }
      <li><Button color="var(--alternate)"
                  dense fullWidth outlined
                  on:click={()=>on_player(j)}>{j}
      </Button></li>
      {/each}
    </ul>
    <br>
    players at net
    <ul class="players">
      {#each home_jerseys as j }
      <li><Button color="var(--alternate)"
                  dense fullWidth outlined
                  on:click={()=>on_player(j, true)}>{j}
      </Button></li>
      {/each}
    </ul>
  </div>
  <div class="net" on:click={()=>on_net()}>
    <span>net</span>
  </div>
  <div class="away">
    <div class="fill" />
    <div class="indicator" class:serving={serving_team === TEAM.AWAY} class:receiving={receiving_team === TEAM.AWAY}>{state_for_team(TEAM.AWAY)}</div>
    floor
    <ul class="floor">
      {#each floor_contacts as f }
      <li><Button color="var(--alternate)"
              dense fullWidth outlined
              on:click={()=>on_floor(TEAM.AWAY, f)}>{f}
      </Button></li>
      {/each}
    </ul>
    <br>
    touches
    <ul class="touches">
      {#each [1,2,3,4] as t }
      <li><Button color="var(--alternate)"
              dense outlined shaped
              on:click={()=>on_touches(t)}>{t}
      </Button></li>
      {/each}
    </ul>
    <br>
    touches at net
    <ul class="touches">
      {#each [1,2,3,4] as t }
      <li><Button color="var(--alternate)"
              dense outlined shaped
              on:click={()=>on_touches(t, true)}>{t}
      </Button></li>
      {/each}
    </ul>
  </div>
</div>