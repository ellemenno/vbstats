<script>
  import { onMount } from 'svelte';
  import { Button, Datefield, Icon, Menu, Menuitem, Textfield } from 'svelte-mui';

  import { TEAM, CONTACT, ACTION } from './constants.js';
  import { match as stored_match } from './stores.js';
  import { logger } from './logger.js';
  import jersey from './icons/jersey.svg'
  import lightning from './icons/lightning.svg'
  import whistle from './icons/whistle.svg'
  import Court from './Court.svelte';
  import JerseyPicker from './JerseyPicker.svelte';
  import Score from './Score.svelte';
  import ServingTeamPicker from './ServingTeamPicker.svelte';
  import SpeedCourt from './SpeedCourt.svelte';
  import Transcript from './Transcript.svelte';

  const log = logger('recorder: ');
  const MENU_DY = 80; // FIXME: magic number.. where is this vertical offset coming from?

  const RALLY_STATE = {
    SERVING:'serving', SERVE_RECEIVING:'serve_receiving',
    RECEIVER_RALLYING2:'receiver_rallying2', RECEIVER_RALLYING3:'receiver_rallying3',
    RECEIVER_ATTACKING:'receiver_attacking', RECEIVER_BLOCKING:'receiver_blocking',
    SERVER_RALLYING2:'server_rallying2', SERVER_RALLYING3:'server_rallying3',
    SERVER_ATTACKING:'server_attacking', SERVER_BLOCKING:'server_blocking',
  }

  const first = (array) => array[0]
  const last = (array) => array[array.length-1]

  const array_into_rows = (A) => {
    const root = Math.ceil(Math.sqrt(A.length));
    let i = 0;
    let rows = [];
    for (let c = 0; c < root; c++) {
      let row = [];
      for (let r = 0; r < root; r++) {
        row.push({ type: CONTACT.PLAYER, value:`#${A[i]}` });
        i++;
        if (i === A.length) break;
      }
      rows.push(row);
      if (i === A.length) break;
    }
    return rows;
  }

  const new_rally = (serving) => ({
    state: RALLY_STATE.SERVING,
    serving_team: serving,
    hits: 0,
    contacts: [],
  })

  const new_set = () => {
    const set = { score: {}, rallies: [], winner: null };
    set.score[TEAM.HOME] = 0;
    set.score[TEAM.AWAY] = 0;
    return set;
  }

  const reset_match = (match, num_sets) => {
    match.sets.splice(0, match.sets.length, ...Array(num_sets).fill(null).map(()=>new_set()));
  }

  const score_for_set = (match, set_index, team) => match.sets[set_index] ? match.sets[set_index].score[team] : 0;

  const num_set_wins = (match, team) => {
    return match.sets.reduce((a,v) => (a + ((v.winner === team) ? 1 : 0)), 0);
  }

  const match_winner_info = (match, set_index, min_wins=2) => {
    let has_won = false;
    let team = null;

    if (set_index+1 >= min_wins) {
      if      (num_set_wins(match, TEAM.HOME) >= min_wins) { has_won = true; team = TEAM.HOME; }
      else if (num_set_wins(match, TEAM.AWAY) >= min_wins) { has_won = true; team = TEAM.AWAY; }
    }

    return [has_won, team];
  }

  const set_winner_info = (match, set_index, min_wins=2) => {
    let has_won = false;
    let team = null;

    const h = score_for_set(match, set_index, TEAM.HOME);
    const a = score_for_set(match, set_index, TEAM.AWAY);
    const threshold = (set_index < min_wins) ? 25 : 15;

    if (Math.max(h, a) >= threshold && Math.abs(h - a) >= 2) {
      has_won = true;
      team = (h > a) ? TEAM.HOME : TEAM.AWAY;
    }

    return [has_won, team];
  }

  const score_summary = (match, set_index) => {
    const sets_h = num_set_wins(match, TEAM.HOME);
    const score_h = score_for_set(match, set_index, TEAM.HOME);
    const score_a = score_for_set(match, set_index, TEAM.AWAY);
    const sets_a = num_set_wins(match, TEAM.AWAY);
    return `score: (${sets_h}) H ${score_h} | ${score_a} A (${sets_a})`
  }

  const point_for = (team, match, set_index) => {
    match.sets[set_index].score[team] += 1;
    log.info(score_summary(match, set_index));
  }

  const add_new_rally_to_set = (possession, current) => {
    const {match, set_index} = current;
    log.info(`starting new rally in set ${set_index+1}, ${team_aliases[possession]} (${possession}) team serving..`);
    match.sets[set_index].rallies.push(new_rally(possession));
    current.rally = last(match.sets[set_index].rallies);
  }

  const attribute_action_to_last_player = (rally, contact) => {
    const latest = last(rally.contacts);
    contact.player = latest.player;
    log.debug(`attributed current action (${contact.action}) to ${latest.player}`);
  }

  const update_last_recorded_action = (rally, action, description) => {
    const latest = last(rally.contacts);
    const old = latest.action;
    latest.action = action;
    latest.description = description;
    log.debug(`resolved last action from: ${old} to ${latest.action} (${latest.description})`);
  }

  const needs_specifier = (contact, rally) => {
    if (contact.is_speedy) { return false; }
    if (is_net_area(contact.area_id)) { return false; }
    if (rally.state === RALLY_STATE.SERVING && !is_service_area(contact.area_id, rally.serving_team)) { return false; }
    return true;
  }

  const is_out = (area) => (area.startsWith(`free-`) || area.startsWith(`net-`));

  const is_net_area = (area) => area.startsWith('net-');

  const is_blocking_area = (area, team) => area.startsWith(`block-${team}`);

  const is_service_area = (area, team) => area.startsWith(`free-${team}-service`);

  const is_court_area = (area, team) => area.startsWith(`court-${team}`);

  const is_free_area = (area, team) => area.startsWith(`free-${team}`);

  const is_play_area = (area, team) => (is_court_area(area, team) || is_blocking_area(area, team));

  const team_from_area = (area) => area.split('-')[1];

  const other_team = (team) => (team === TEAM.HOME) ? TEAM.AWAY : TEAM.HOME;

  const serving_team = (rally) => rally && rally.serving_team ? rally.serving_team : '';

  const receiving_team = (rally) => rally && rally.serving_team ? other_team(rally.serving_team) : '';

  const process_contact = (current) => {
    const {contact, rally, match} = current;
    log.debug(`ball contact with ${contact.type} in ${contact.area_id}`);

    let servers = serving_team(rally);
    let receivers = receiving_team(rally);
    let possession = servers;
    let area = contact.area_id;
    let action;
    let is_valid = true;
    let rally_ends = true;

    const record_action = (msg, action, team) => {
      log.info(action.toUpperCase(), msg);
      contact.description = msg;
      contact.action = action;
      contact.team = team;
    }

    switch (rally.state) {
      case RALLY_STATE.SERVING:
        if (contact.type === CONTACT.PLAYER && is_service_area(area, servers)) {
          record_action(`serve: ${team_aliases[servers]} (${servers}) serving ${team_aliases[receivers]}`, ACTION.SERVE, servers);
          rally_ends = false;
          rally.hits = 0;
          rally.state = RALLY_STATE.SERVE_RECEIVING;
        }
        else {
          is_valid = false;
          log.warn(`invalid contact: expected ${CONTACT.PLAYER} contact in service area of ${servers} team`);
        }
      break;

      case RALLY_STATE.SERVE_RECEIVING:
        if (contact.type === CONTACT.PLAYER && is_play_area(area, receivers)) {
          if (is_blocking_area(area, receivers)) {
            record_action('reception error: cannot block a serve', ACTION.RECEPTION_ERROR, receivers);
            rally_ends = true;
            possession = servers;
          }
          else {
            rally.hits += 1;
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          record_action('service ace', ACTION.ACE, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (is_net_area(area)) {
          record_action('service error: net contact', ACTION.SERVICE_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (is_out(area)) {
          if (contact.type === CONTACT.PLAYER && is_free_area(area, receivers)) {
            rally.hits += 1;
            record_action(`reception: dig or attack [in free area], hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          else {
            record_action('service error: ball landed out of bounds', ACTION.SERVICE_ERROR, servers);
            attribute_action_to_last_player(rally, contact);
            rally_ends = true;
            possession = receivers;
          }
          break;
        }
        if (is_play_area(area, servers)) {
          record_action('service error: ball contact on serving team court', ACTION.SERVICE_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        log.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.RECEIVER_RALLYING2:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          if (is_blocking_area(area, servers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, servers)
            rally.state = RALLY_STATE.SERVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, servers);
            rally.state = RALLY_STATE.SERVER_RALLYING2;
          }
          rally_ends = false;
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.DIG, 'reception: dig');
          record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK, receivers);
          rally_ends = false;
          rally.state = RALLY_STATE.RECEIVER_RALLYING3;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          record_action('attack kill', ACTION.KILL, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.DIG, 'reception: dig');
          record_action('reception error: net contact', ACTION.RECEPTION_ERROR, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.DIG, 'reception: dig');
          record_action('reception error: ball landed out of bounds', ACTION.RECEPTION_ERROR, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.DIG, 'reception: dig');
          record_action('reception error: ball dropped', ACTION.RECEPTION_ERROR, receivers);
          rally_ends = true;
          possession = servers;
          break;
        }
        log.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.RECEIVER_RALLYING3:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          if (is_blocking_area(area, servers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, servers);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, servers);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action(`reception: attack (hit ${rally.hits})`, ACTION.ATTACK, receivers);
          rally_ends = false;
          rally.state = RALLY_STATE.RECEIVER_ATTACKING;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          record_action('attack kill', ACTION.KILL, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action('passing error: net contact', ACTION.PASSING_ERROR, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action('passing error: ball landed out of bounds', ACTION.PASSING_ERROR, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action('passing error: ball dropped', ACTION.PASSING_ERROR, receivers);
          rally_ends = true;
          possession = servers;
          break;
        }
        log.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.RECEIVER_ATTACKING:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
          if (is_blocking_area(area, servers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, servers);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, servers);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          record_action('attack kill', ACTION.KILL, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (is_net_area(area)) {
          record_action('attacking error: net contact', ACTION.ATTACKING_ERROR, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          record_action('attacking error: ball landed out of bounds', ACTION.ATTACKING_ERROR, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          record_action('attacking error: ball dropped', ACTION.ATTACKING_ERROR, receivers);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits += 1;
          record_action(`attacking error: too many hits (${rally.hits})`, ACTION.ATTACKING_ERROR, receivers);
          rally_ends = true;
          possession = servers;
          break;
        }
      break;

      case RALLY_STATE.RECEIVER_BLOCKING:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          if (is_blocking_area(area, servers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, servers);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, servers);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK, receivers);
          rally_ends = false;
          rally.state = RALLY_STATE.RECEIVER_RALLYING3;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.BLOCK, 'block attempt');
          record_action('block kill', ACTION.BLOCK_KILL, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          record_action('attack error: net contact', ACTION.ATTACKING_ERROR, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          record_action('attacking error: ball landed out of bounds', ACTION.ATTACKING_ERROR, receivers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          record_action('attacking error: ball dropped', ACTION.ATTACKING_ERROR, receivers);
          rally_ends = true;
          possession = servers;
          break;
        }
      break;

      case RALLY_STATE.SERVER_RALLYING2:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          if (is_blocking_area(area, receivers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, receivers)
            rally.state = RALLY_STATE.RECEIVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          rally_ends = false;
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.DIG, 'reception: dig');
          record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK, servers);
          rally_ends = false;
          rally.state = RALLY_STATE.SERVER_RALLYING3;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          record_action('attack kill', ACTION.KILL, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.DIG, 'reception: dig');
          record_action('reception error: net contact', ACTION.RECEPTION_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.DIG, 'reception: dig');
          record_action('reception error: ball landed out of bounds', ACTION.RECEPTION_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.DIG, 'reception: dig');
          record_action('reception error: ball dropped', ACTION.RECEPTION_ERROR, servers);
          rally_ends = true;
          possession = receivers;
          break;
        }
        log.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.SERVER_RALLYING3:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          if (is_blocking_area(area, receivers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, receivers);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action(`reception: attack (hit ${rally.hits})`, ACTION.ATTACK, servers);
          rally_ends = false;
          rally.state = RALLY_STATE.SERVER_ATTACKING;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          record_action('attack kill', ACTION.KILL, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action('passing error: net contact', ACTION.PASSING_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action('passing error: ball landed out of bounds', ACTION.PASSING_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action('passing error: ball dropped', ACTION.PASSING_ERROR, servers);
          rally_ends = true;
          possession = receivers;
          break;
        }
        log.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.SERVER_ATTACKING:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
          if (is_blocking_area(area, receivers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, receivers);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          record_action('attack kill', ACTION.KILL, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (is_net_area(area)) {
          record_action('attacking error: net contact', ACTION.ATTACKING_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          record_action('attacking error: ball landed out of bounds', ACTION.ATTACKING_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          record_action('attacking error: ball dropped', ACTION.ATTACKING_ERROR, servers);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits += 1;
          record_action(`attacking error: too many hits (${rally.hits})`, ACTION.ATTACKING_ERROR, servers);
          rally_ends = true;
          possession = receivers;
          break;
        }
      break;

      case RALLY_STATE.SERVER_BLOCKING:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          if (is_blocking_area(area, receivers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK, receivers);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK, receivers);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.PASS, 'reception: pass');
          record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK, servers);
          rally_ends = false;
          rally.state = RALLY_STATE.SERVER_RALLYING3;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.BLOCK, 'block attempt');
          record_action('block kill', ACTION.BLOCK_KILL, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          record_action('attack error: net contact', ACTION.ATTACKING_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.ATTACK, 'attack attempt');
          record_action('attacking error: ball landed out of bounds', ACTION.ATTACKING_ERROR, servers);
          attribute_action_to_last_player(rally, contact);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          record_action('attacking error: ball dropped', ACTION.ATTACKING_ERROR, servers);
          rally_ends = true;
          possession = receivers;
          break;
        }
      break;
    }

    if (!contact.action) { log.debug('no action'); }
    if (!is_valid) { return; }

    rally.contacts.push(contact);
    let need_new_rally = false;

    if (rally_ends) { need_new_rally = process_rally_end(current, possession); }
    else { log.info('rally continues..'); }

    if (need_new_rally) { add_new_rally_to_set(possession, current); }
    $stored_match = match; // trigger store update
  }

  const process_rally_end = (current, possession) => {
    const set_index = current.set_index;
    const match = current.match;
    let need_new_rally = false;

    log.info('rally ends.');
    point_for(possession, match, set_index);
    log.debug('current:', current);

    const [set_ends, set_winner] = set_winner_info(match, set_index);
    if (set_ends) {
      log.info(`set ${set_index+1} ends. ${team_aliases[set_winner]} (${set_winner}) team wins.`);
      match.sets[set_index].winner = set_winner;

      const [match_ends, match_winner] = match_winner_info(match, set_index);
      if (match_ends) {
        log.info(`match ends. ${team_aliases[match_winner]} (${match_winner}) team wins.`);
        recording = false;
        serving_team_picker_visible = true;
      }
      else {
        current.set_index = set_index + 1;
        need_new_rally = true;
      }
    }
    else { need_new_rally = true; }

    return need_new_rally;
  }

  const set_menu_props = ({el_x:x, el_y:y, el_rect, area_id}) => {
    // position menu to open near contact and grow towards center of court
    const {width:w, height:h} = el_rect;
    const tb = (y < h/2) ? 'top'  : 'bottom';
    const lr = (x < w/2) ? 'left' : 'right';
    menu_origin = `${tb} ${lr}`;
    menu_offset.dx = lr === 'left' ? x : w-x;
    menu_offset.dy = tb === 'top'  ? y-MENU_DY : h-y+MENU_DY;
    // set specifiers appropriate to contact location
    current.specifiers = specifiers[team_from_area(area_id)];
  }

  const start_match = (serving, num_sets=3) => {
    recording = true;

    reset_match(current.match, num_sets);
    current.set_index = 0;
    log.info('starting new match:', current.match);
    log.info(score_summary(current.match, current.set_index));

    add_new_rally_to_set(serving, current);
    current.specifiers = specifiers[serving];
  }


  const on_specify = (type, value) => {
    specifying = false;
    current.contact.type = type;
    if (type === CONTACT.PLAYER) { current.contact.player = value; }
    process_contact(current);
  }

  const on_speed_toggle = () => { speed_mode = !speed_mode; }

  const on_jersey = () => { jersey_picker_visible = true; }

  const on_whistle = (possession) => {
    log.debug(`whistle! point and possession go to: ${possession}`);

    update_last_recorded_action(current.rally, ACTION.VIOLATION, `violation: point for ${team_aliases[possession]} (${possession})`);
    const need_new_rally = process_rally_end(current, possession);
    if (need_new_rally) { add_new_rally_to_set(possession, current); }
    $stored_match = current.match; // trigger store update
  }

  const on_contact = (e) => {
    /* contact:
       .type
       .player
       .team
       .description
       .action
       .area_id
       .court_x
       .court_y
    */
    if (!recording) {
      log.debug('not in recording mode');
      e.detail.source_event && e.detail.source_event.stopPropagation();
      return;
    }
    if (specifying) { specifying = false; log.debug('specify cancelled'); return; }

    // log.debug(`contact with ${e.detail.area_id} at [${e.detail.el_x}, ${e.detail.el_y}]`);
    current.contact = e.detail;

    if (needs_specifier(current.contact, current.rally)) {
      specifying = true;
      set_menu_props(current.contact);
    }
    else {
      current.contact.source_event && current.contact.source_event.stopPropagation();
      if (is_net_area(current.contact.area_id)) { current.contact.type = CONTACT.FLOOR; }
      process_contact(current);
    }

    delete current.contact.el_rect; // no longer needed after this function
    delete current.contact.source_event; // no longer needed after this function
  }

  const on_venue_change = (e) => {
    log.debug('on_venue_change', $stored_match.venue);
  }

  const on_date_change = ({detail}) => {
    log.debug('on_date_change', detail.toISOString());
    $stored_match.date = detail.toISOString(); // trigger store update
  }

  const on_serving_team_selected = ({detail}) => {
    log.debug('on_serving_team_selected:', detail.team);
    serving_team_picker_visible = false;
    start_match(detail.team);
  }

  let competition_date = new Date();
  const date_format = 'YYYY.MM.DD';

  let menu_width, menu_height; // read-only
  let menu_offset = { dx:0, dy:0 };
  let menu_origin = 'top left';

  let specifiers = {
    'home':{
      'groups':[],
    },
    'away':{
      'groups':[
        [ { type: CONTACT.PLAYER, value:'Player' } ]
      ],
    },
    'both':[
      { type: CONTACT.FLOOR, value:'Floor' },
    ],
  };

  let team_aliases = {
    'home': 'my team',
    'away': 'their team',
  };

  let jersey_numbers = [1,2,3,4,5,6,7,8,9,10,11];
  let jersey_picker_visible = false;
  let serving_team_picker_visible = false;

  let current = { match:$stored_match, set_index:0, rally:null, contact:null, specifiers:null };
  let recording = true;
  let specifying = false;
  let speed_mode = false;

  $: {
    specifiers['home']['groups'] = array_into_rows(jersey_numbers);
  }

  onMount(async () => {
    serving_team_picker_visible = true;
    on_date_change({detail: competition_date});
  });
</script>

<style>
  .widener > :global(:first-child) { width:100%; }
  .control-bar {
    background-color: var(--bg-color);
    column-gap: 0.5em;
    display: grid;
    grid-template-columns: 0.3fr 2.5fr minmax(10em, 2fr) 2.5fr 0.3fr;
    margin: 0.75rem 0 0.75rem 0;
  }
  .control-bar:nth-child(1) { max-width: 8em; justify-self: end; }
  .control-bar:nth-child(5) { max-width: 8em; justify-self: start; }
  .title-bar {
    column-gap: 1em;
    display: grid;
    grid-template-columns: 1.5fr 0.2fr 0.9fr 0.9fr;
    margin-bottom: -1rem;
  }
  .title-bar h2 { margin-bottom: 2rem; }
  .title-bar :global(.text-field), .title-bar :global(.date-field) {
    align-self: center;
  }
</style>

<div class="title-bar">
  <h2>record a match</h2>
  <Button style="margin: auto;" outlined icon toggle active={speed_mode} on:click={()=>on_speed_toggle()}>
    <Icon><svelte:component this={lightning} /></Icon>
  </Button>
  <Textfield
    autocomplete="off"
    label="venue"
    bind:value={$stored_match.venue}
    on:change={on_venue_change}
  />
  <Datefield
    icon
    format={date_format}
    readonly
    value={competition_date}
    on:date-change={on_date_change}
  />
</div>

<div>
  <div class="widener" bind:clientWidth={menu_width} bind:clientHeight={menu_height}>
    {#if speed_mode}
    <SpeedCourt is_serve={current.rally && current.rally.state === RALLY_STATE.SERVING} serving_team={serving_team(current.rally)} receiving_team={receiving_team(current.rally)} home_jerseys={jersey_numbers} on:contact={on_contact} />
    {:else}
    <Menu origin={menu_origin} {...menu_offset}>
      <div slot="activator" style="display:flex;">
        <Court on:contact={on_contact} />
      </div>

      {#each current.specifiers.groups as g}
      <tr>
      {#each g as s}
        <td><Button fullWidth class="menu-item" on:click={()=>on_specify(s.type, s.value)}>{s.value}</Button></td>
      {/each}
      </tr>
      {/each}
      <hr />
      {#each specifiers.both as s}
      <Menuitem on:click={()=>on_specify(s.type, s.value)}>{s.value}</Menuitem>
      {/each}
    </Menu>
    {/if}
    {#if serving_team_picker_visible}
    <ServingTeamPicker on:team_selected={on_serving_team_selected} />
    {/if}
  </div>

  <div class="control-bar">
    <Button icon color="var(--team-home-rgb)" style="transform: scale(1.5);" on:click={()=>on_jersey()}>
      <Icon style="transform: scale(1.25);"><svelte:component this={jersey} /></Icon>
    </Button>

    <Textfield
      outlined
      style="margin: 0; align-self: center;"
      label={TEAM.HOME}
      bind:value={team_aliases[TEAM.HOME]}
    />

    <Score
      current_set={current.set_index+1}
      home_score={score_for_set(current.match, current.set_index, TEAM.HOME)}
      home_sets={num_set_wins(current.match, TEAM.HOME)}
      away_sets={num_set_wins(current.match, TEAM.AWAY)}
      away_score={score_for_set(current.match, current.set_index, TEAM.AWAY)}
    />

    <Textfield
      outlined
      style="margin: 0 0 0 1.5rem; align-self: center;"
      label={TEAM.AWAY}
      bind:value={team_aliases[TEAM.AWAY]}
    />

    <Menu origin="bottom right" dy={MENU_DY}>
      <div slot="activator">
        <Button icon style="margin-left: 1.5rem; margin-right: 0.5rem; float: right; transform: scale(1.5);" color="var(--action-error-rgb)" disabled={!recording}>
          <Icon style="transform: scale(1.25);"><svelte:component this={whistle} /></Icon>
        </Button>
      </div>

      {#each [TEAM.HOME, TEAM.AWAY] as t}
      <Menuitem on:click={()=>on_whistle(t)}>Point for {t} team</Menuitem>
      {/each}
      <hr />
      <Menuitem>Cancel</Menuitem>
    </Menu>
  </div>
</div>

<Transcript set_index={current.set_index} />

<JerseyPicker bind:visible={jersey_picker_visible} bind:jerseys={jersey_numbers} />
