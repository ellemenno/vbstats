<script>
  import { ExpansionPanel } from 'svelte-mui';
  import { tidy, arrange, count, desc, endsWith, filter, groupBy, innerJoin, mutate, n, pivotWider, replaceNully, select, transmute } from '@tidyjs/tidy'

  import { ACTION_POINT, ACTION_ERROR, PLAYER_STAT_COLUMNS, TEAM } from './constants.js';
  import { match } from './stores.js';
  import { logger } from './logger.js';
  import Table from './Table.svelte';

  const log = logger('visualizer: ');

  const sum_keys = (row, keys) => keys.reduce((a,v) => Object.keys(row).includes(v) ? a + row[v] : a, 0)

  const on_panel_change = ({ detail }) => {
    log.debug(`panel ${detail.name} is ${detail.expanded ? 'open' : 'closed'}`);
  }

  $: combined_rallies = $match.reduce((a,v)=>a.concat(v.rallies), [])

  $: all_contacts = combined_rallies.reduce((a,v)=>a.concat(v.contacts), [])

  $: action_summary = tidy(all_contacts,
    filter( c => (c.team === TEAM.HOME)),
    groupBy('player', [count('action')]),
    arrange('action'),
  )

  $: player_stats = tidy(
    action_summary,
    pivotWider({
      namesFrom: 'action',
      valuesFrom: 'n',
    }),
    replaceNully(Object.fromEntries(PLAYER_STAT_COLUMNS.map(v => [v,0]))),
    select(PLAYER_STAT_COLUMNS),
    arrange('player'),
  )

  $: points_won = tidy(player_stats,
    select(['player', ...ACTION_POINT]),
    transmute({
      player: (d) => d.player,
      'points won': (d) => sum_keys(d, ACTION_POINT),
    }),
    arrange([desc('points won'), 'player']),
  )

  $: points_lost = tidy(player_stats,
    select(['player', ...ACTION_ERROR]),
    transmute({
      player: (d) => d.player,
      'points lost': (d) => sum_keys(d, ACTION_ERROR),
    }),
    arrange([desc('points lost'), 'player']),
  )

  $: player_points = tidy(points_won,
    innerJoin(points_lost, { by: 'player' }),
    mutate({ 'net value': (d) => d['points won'] - d['points lost'] }),
    arrange('player'),
  )

  $: log.info('stats', player_stats);

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