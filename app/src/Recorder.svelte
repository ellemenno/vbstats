<script>
  import { onMount } from 'svelte';
  import { ButtonGroup, Button, Menu, Menuitem } from 'svelte-mui';
  import Court from "./Court.svelte";

  const TEAM = { HOME:'home', AWAY:'away' }
  const CONTACT = { PLAYER:'player', FLOOR:'floor' };
  const RALLY_STATE = {
    SERVING:'serving', SERVE_RECEIVING:'serve_receiving',
    RECEIVER_RALLYING2:'receiver_rallying2', RECEIVER_RALLYING3:'receiver_rallying3',
    RECEIVER_ATTACKING:'receiver_attacking', RECEIVER_BLOCKING:'receiver_blocking',
    SERVER_RALLYING2:'server_rallying2', SERVER_RALLYING3:'server_rallying3',
    SERVER_ATTACKING:'server_attacking', SERVER_BLOCKING:'server_blocking',
  }
  const ACTION = {
    SERVE:'serve', ACE:'ace', SERVICE_ERROR:'service error',
    DIG_OR_ATTACK:'dig_or_attack', DIG:'dig', RECEPTION_ERROR:'reception error',
    PASS_OR_ATTACK:'pass_or_attack', PASS:'pass', PASSING_ERROR:'passing error',
    ATTACK:'attack', KILL:'kill', ATTACKING_ERROR:'attacking error',
    BLOCK_OR_ATTACK:'block_or_attack', BLOCK:'block', BLOCKING_ERROR:'blocking error',
    VIOLATION:'violation',
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
    match.splice(0, match.length, ...Array(num_sets).fill(null).map(()=>new_set()));
  }

  const num_set_wins = (match, team) => {
    return match.reduce((a,v) => (a + ((v.winner === team) ? 1 : 0)), 0);
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

    const h = match[set_index].score[TEAM.HOME];
    const a = match[set_index].score[TEAM.AWAY];
    const threshold = (set_index < min_wins) ? 25 : 15;

    if (Math.max(h, a) >= threshold && Math.abs(h - a) >= 2) {
      has_won = true;
      team = (h > a) ? TEAM.HOME : TEAM.AWAY;
    }

    return [has_won, team];
  }

  const score_summary = (match, set_index) => `score: (${num_set_wins(match, TEAM.HOME)}) H ${match[set_index].score[TEAM.HOME]} | ${match[set_index].score[TEAM.AWAY]} A (${num_set_wins(match, TEAM.AWAY)})`

  const point_for = (team, match, set_index) => {
    match[set_index].score[team] += 1;
    console.log(score_summary(match, set_index));
  }

  const update_last_recorded_action = (rally, action) => {
    const latest = rally.contacts[rally.contacts.length-1];
    const old = latest.action;
    latest.action = action;
    console.log(`resolved last action from: ${old} to ${latest.action}`);
  }

  const needs_specifier = (contact, rally) => {
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

  const serving_team = (rally) => rally.serving_team;

  const receiving_team = (rally) => other_team(rally.serving_team);

  const process_contact = (current) => {
    const {contact, rally, match} = current;
    console.log(`ball contact with ${contact.type} in ${contact.area_id}`);

    let servers = serving_team(rally);
    let receivers = receiving_team(rally);
    let possession = servers;
    let area = contact.area_id;
    let action;
    let is_valid = true;
    let rally_ends = true;

    const record_action = (msg, action) => {
      console.log(action.toUpperCase(), msg);
      contact.description = msg;
      contact.action = action;
    }

    switch (rally.state) {
      case RALLY_STATE.SERVING:
        if (contact.type === CONTACT.PLAYER && is_service_area(area, servers)) {
          record_action(`${team_aliases[servers]} (${servers}) serving ${team_aliases[receivers]}`, ACTION.SERVE);
          rally_ends = false;
          rally.hits = 0;
          rally.state = RALLY_STATE.SERVE_RECEIVING;
        }
        else {
          is_valid = false;
          console.log(`invalid contact; expected ${CONTACT.PLAYER} contact in service area of ${servers} team`);
        }
      break;

      case RALLY_STATE.SERVE_RECEIVING:
        if (contact.type === CONTACT.PLAYER && is_play_area(area, receivers)) {
          if (is_blocking_area(area, receivers)) {
            record_action('reception error; cannot block a serve', ACTION.RECEPTION_ERROR);
            rally_ends = true;
            possession = servers;
          }
          else {
            rally.hits += 1;
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          record_action('service ace', ACTION.ACE);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (is_net_area(area)) {
          record_action('service error, net contact', ACTION.SERVICE_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (is_out(area)) {
          if (contact.type === CONTACT.PLAYER && is_free_area(area, receivers)) {
            rally.hits += 1;
            record_action(`reception: dig or attack [in free area], hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          else {
            record_action('service error, ball landed out of bounds', ACTION.SERVICE_ERROR);
            rally_ends = true;
            possession = receivers;
          }
          break;
        }
        if (is_play_area(area, servers)) {
          record_action('service error, ball contact on serving team court', ACTION.SERVICE_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        console.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.RECEIVER_RALLYING2:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK);
          if (is_blocking_area(area, servers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK)
            rally.state = RALLY_STATE.SERVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally.state = RALLY_STATE.SERVER_RALLYING2;
          }
          rally_ends = false;
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.DIG);
          record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK);
          rally_ends = false;
          rally.state = RALLY_STATE.RECEIVER_RALLYING3;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.ATTACK);
          record_action('attack kill', ACTION.KILL);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.DIG);
          record_action('reception error, net contact', ACTION.RECEPTION_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.DIG);
          record_action('reception error, ball landed out of bounds', ACTION.RECEPTION_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.DIG);
          record_action('reception error, ball dropped', ACTION.RECEPTION_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        console.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.RECEIVER_RALLYING3:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK);
          if (is_blocking_area(area, servers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.PASS);
          record_action(`reception: attack (hit ${rally.hits})`, ACTION.ATTACK);
          rally_ends = false;
          rally.state = RALLY_STATE.RECEIVER_ATTACKING;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.ATTACK);
          record_action('attack kill', ACTION.KILL);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.PASS);
          record_action('passing error, net contact', ACTION.PASSING_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.PASS);
          record_action('passing error, ball landed out of bounds', ACTION.PASSING_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.PASS);
          record_action('passing error, ball dropped', ACTION.PASSING_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        console.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.RECEIVER_ATTACKING:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
          if (is_blocking_area(area, servers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          record_action('attack kill', ACTION.KILL);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (is_net_area(area)) {
          record_action('attacking error, net contact', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          record_action('attacking error, ball landed out of bounds', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          record_action('attacking error, ball dropped', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits += 1;
          record_action(`attacking error: too many hits (${rally.hits})`, ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
      break;

      case RALLY_STATE.RECEIVER_BLOCKING:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits = 1; // ball crossed from receivers to servers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK);
          if (is_blocking_area(area, servers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.SERVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.PASS);
          record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK);
          rally_ends = false;
          rally.state = RALLY_STATE.RECEIVER_RALLYING3;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.BLOCK);
          record_action('block', ACTION.KILL);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.ATTACK);
          record_action('attacking error, ball landed out of bounds', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          record_action('attacking error, ball dropped', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = servers;
          break;
        }
      break;

      case RALLY_STATE.SERVER_RALLYING2:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK);
          if (is_blocking_area(area, receivers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK)
            rally.state = RALLY_STATE.RECEIVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          rally_ends = false;
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.DIG);
          record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK);
          rally_ends = false;
          rally.state = RALLY_STATE.SERVER_RALLYING3;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.ATTACK);
          record_action('attack kill', ACTION.KILL);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.DIG);
          record_action('reception error, net contact', ACTION.RECEPTION_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.DIG);
          record_action('reception error, ball landed out of bounds', ACTION.RECEPTION_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.DIG);
          record_action('reception error, ball dropped', ACTION.RECEPTION_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        console.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.SERVER_RALLYING3:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK);
          if (is_blocking_area(area, receivers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.PASS);
          record_action(`reception: attack (hit ${rally.hits})`, ACTION.ATTACK);
          rally_ends = false;
          rally.state = RALLY_STATE.SERVER_ATTACKING;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.ATTACK);
          record_action('attack kill', ACTION.KILL);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (is_net_area(area)) {
          update_last_recorded_action(rally, ACTION.PASS);
          record_action('passing error, net contact', ACTION.PASSING_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.PASS);
          record_action('passing error, ball landed out of bounds', ACTION.PASSING_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          update_last_recorded_action(rally, ACTION.PASS);
          record_action('passing error, ball dropped', ACTION.PASSING_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        console.error(`unhandled scenario in rally state ${rally.state}`);
      break;

      case RALLY_STATE.SERVER_ATTACKING:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
          if (is_blocking_area(area, receivers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          record_action('attack kill', ACTION.KILL);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (is_net_area(area)) {
          record_action('attacking error, net contact', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          record_action('attacking error, ball landed out of bounds', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          record_action('attacking error, ball dropped', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits += 1;
          record_action(`attacking error: too many hits (${rally.hits})`, ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
      break;

      case RALLY_STATE.SERVER_BLOCKING:
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, receivers) || is_free_area(area, receivers))) {
          rally.hits = 1; // ball crossed from servers to receivers, so reset hit count
          update_last_recorded_action(rally, ACTION.ATTACK);
          if (is_blocking_area(area, receivers)) {
            record_action(`block or attack attempt (hit ${rally.hits})`, ACTION.BLOCK_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_BLOCKING;
          }
          else {
            record_action(`reception: dig or attack (hit ${rally.hits})`, ACTION.DIG_OR_ATTACK);
            rally_ends = false;
            rally.state = RALLY_STATE.RECEIVER_RALLYING2;
          }
          break;
        }
        if (contact.type === CONTACT.PLAYER && (is_play_area(area, servers) || is_free_area(area, servers))) {
          rally.hits += 1;
          update_last_recorded_action(rally, ACTION.PASS);
          record_action(`reception: pass or attack (hit ${rally.hits})`, ACTION.PASS_OR_ATTACK);
          rally_ends = false;
          rally.state = RALLY_STATE.SERVER_RALLYING3;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, receivers)) {
          update_last_recorded_action(rally, ACTION.BLOCK);
          record_action('block', ACTION.KILL);
          rally_ends = true;
          possession = servers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_out(area)) {
          update_last_recorded_action(rally, ACTION.ATTACK);
          record_action('attacking error, ball landed out of bounds', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
        if (contact.type === CONTACT.FLOOR && is_play_area(area, servers)) {
          record_action('attacking error, ball dropped', ACTION.ATTACKING_ERROR);
          rally_ends = true;
          possession = receivers;
          break;
        }
      break;
    }

    if (!contact.action) { console.log('no action'); }
    if (!is_valid) { return; }

    rally.contacts.push(contact);
    let need_new_rally = false;

    if (rally_ends) {
      const set_index = current.set_index;
      console.log(`rally ends. appending to set ${set_index+1}`);
      match[set_index].rallies.push(rally);
      point_for(possession, match, set_index);
      console.log('current:', current);

      const [set_ends, set_winner] = set_winner_info(match, set_index);
      if (set_ends) {
        console.log(`set ${set_index+1} ends. ${team_aliases[set_winner]} (${set_winner}) team wins.`);
        match[set_index].winner = set_winner;

        const [match_ends, match_winner] = match_winner_info(match, set_index);
        if (match_ends) {
          console.log(`match ends. ${team_aliases[match_winner]} (${match_winner}) team wins.`);
          recording = false;
          // TODO: signal UI and reactivate New Match button
        }
        else {
          current.set_index = set_index + 1;
          need_new_rally = true;
        }
      }
      else { need_new_rally = true; }
    }
    else { console.log('rally continues..'); }

    if (need_new_rally) {
      console.log(`starting new rally, ${team_aliases[possession]} (${possession}) team serving..`);
      current.rally = new_rally(possession);
    }
  }

  const set_menu_props = ({el_x:x, el_y:y, el_rect, area_id}) => {
    // position menu to open near contact and grow towards center of court
    const {width:w, height:h} = el_rect;
    const tb = (y < h/2) ? 'top'  : 'bottom';
    const lr = (x < w/2) ? 'left' : 'right';
    const k = 80; // FIXME: magic number.. where is this vertical offset coming from?
    menu_origin = `${tb} ${lr}`;
    menu_offset.dx = lr === 'left' ? x : w-x;
    menu_offset.dy = tb === 'top'  ? y-k : h-y+k;
    // set specifiers appropriate to contact location
    current.specifiers = specifiers[team_from_area(area_id)];
  }

  const on_contact = (e) => {
    if (!recording) {
      console.log('not in recording mode');
      e.detail.source_event.stopPropagation();
      return;
    }
    if (specifying) { specifying = false; console.log('specify cancelled'); return; }

    // console.log(`contact with ${e.detail.area_id} at [${e.detail.el_x}, ${e.detail.el_y}]`);
    current.contact = e.detail;

    if (needs_specifier(current.contact, current.rally)) {
      specifying = true;
      set_menu_props(current.contact);
    }
    else {
      current.contact.source_event.stopPropagation();
      process_contact(current);
    }

    delete current.contact.el_rect; // no longer needed
    delete current.contact.source_event; // no longer needed
  }

  const on_match_start = (serving, num_sets=3) => {
    recording = true;

    reset_match(current.match, num_sets);
    current.set_index = 0;
    console.log('starting new match:', current.match);
    console.log(score_summary(current.match, current.set_index));

    current.rally = new_rally(serving);
    current.specifiers = specifiers[serving];
    console.log(`starting new rally, ${team_aliases[serving]} (${serving}) team serving..`);
  }

  const on_specify = (type, value) => {
    specifying = false;
    current.contact.type = type;
    current.contact.player = value;
    process_contact(current);
  }

  let menu_width, menu_height; // read-only
  let menu_offset = { dx:0, dy:0 };
  let menu_origin = "top left";
  let match = []; // array of sets
  let current = { match:match, set_index:-1, rally:null, contact:null, specifiers:null };
  let recording = false;
  let specifying = false;

  let specifiers = {
    'home':{
      'groups':[ // TODO: set these via UI
        [
          { type: CONTACT.PLAYER, value:'#01' },
          { type: CONTACT.PLAYER, value:'#02' },
          { type: CONTACT.PLAYER, value:'#03' },
          { type: CONTACT.PLAYER, value:'#04' },
        ],
        [
          { type: CONTACT.PLAYER, value:'#05' },
          { type: CONTACT.PLAYER, value:'#06' },
          { type: CONTACT.PLAYER, value:'#07' },
          { type: CONTACT.PLAYER, value:'#08' },
        ],
        [
          { type: CONTACT.PLAYER, value:'#09' },
          { type: CONTACT.PLAYER, value:'#10' },
          { type: CONTACT.PLAYER, value:'#11' },
        ],
      ],
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


  onMount(async () => {
    // TODO: move this to a `New Match` button that prompts for serving team
    on_match_start(TEAM.HOME);
  });
</script>

<style>
  .widener > :global(:first-child) { width:100%; }
</style>

<h2>record a match</h2>

<div class="widener" bind:clientWidth={menu_width} bind:clientHeight={menu_height}>
<Menu origin={menu_origin} {...menu_offset}>
  <div slot="activator">
    <Court on:contact={on_contact}/>
  </div>

  {#each current.specifiers.groups as g}
  <li><ButtonGroup>
  {#each g as s}
    <Button class='menu-item' on:click={()=>on_specify(s.type, s.value)}>{s.value}</Button>
  {/each}
  </ButtonGroup></li>
  {/each}
  <hr />
  {#each specifiers.both as s}
  <Menuitem on:click={()=>on_specify(s.type, s.value)}>{s.value}</Menuitem>
  {/each}
</Menu>
</div>
