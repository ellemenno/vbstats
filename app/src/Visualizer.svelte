<script>
  import { ExpansionPanel } from 'svelte-mui';
  import { tidy, arrange, count, desc, endsWith, filter, groupBy, innerJoin, mutate, n, pivotWider, select, transmute } from '@tidyjs/tidy'

  import { match } from './stores.js';
  import { logger } from './logger.js';
  import Table from './Table.svelte';

  const log = logger('visualizer: ');

  const on_panel_change = ({ detail }) => {
    log.debug(`panel ${detail.name} is ${detail.expanded ? 'open' : 'closed'}`);
  }

  $: combined_rallies = $match.reduce((a,v)=>a.concat(v.rallies), [])

  $: all_contacts = combined_rallies.reduce((a,v)=>a.concat(v.contacts), [])

  $: action_summary = tidy(all_contacts,
    filter( c => (c.team === 'home')),
    groupBy('player', [
      count('action')
    ]),
    arrange('action'),
  )

  $: player_stats = tidy(
    action_summary,
    pivotWider({
      namesFrom: 'action',
      valuesFrom: 'n',
      valuesFill: 0,
    }),
    select([
      'player',
      'ace', 'block', 'kill',
      'serve', 'dig', 'pass', 'attack',
      endsWith('error'), 'violation' // service -, blocking -, reception -, passing -, attacking -
    ]),
    arrange('player'),
  )

  $: points_won = tidy(player_stats,
    select(['player','ace','block','kill']),
    transmute({
      player: (d) => d.player,
      points_won: (d) => (d.ace || 0) + (d.block || 0) + (d.kill || 0),
    }),
    arrange([desc('points_won'), 'player']),
  )

  $: points_lost = tidy(player_stats,
    select(['player',endsWith('error'),'violation']),
    transmute({
      player: (d) => d.player,
      points_lost: (d) => (0
        + (d['service error'] || 0)
        + (d['reception error'] || 0)
        + (d['passing error'] || 0)
        + (d['attacking error'] || 0)
        + (d['blocking error'] || 0)
        + (d.violation || 0)
      ),
    }),
    arrange([desc('points_lost'), 'player']),
  )

  $: player_points = tidy(points_won,
    innerJoin(points_lost, { by: 'player' }),
    mutate({ net_value: (d) => d.points_won - d.points_lost }),
    arrange('player'),
  )

  $: log.info('stats', player_points);

  let group = '';
</script>

<style>
  .container {
    border-radius: 4px;
  }
</style>

<h2>visualize stats</h2>

<div class="container">
  <ExpansionPanel name="contribution" expand dense bind:group on:change={on_panel_change}>
    <Table data={player_points} />
  </ExpansionPanel>

  <ExpansionPanel name="actions" dense bind:group on:change={on_panel_change}>
    <Table data={player_stats} />
  </ExpansionPanel>
</div>