<script>
  import { onMount } from 'svelte';
  import { ButtonGroup, Button, Menu, Menuitem } from 'svelte-mui';
  import Court from "./Court.svelte";

  const TEAM = { HOME:'home', AWAY:'away' }
  const RALLY_STATE = { SERVING:'serving', SERVE_RECEIVING:'serve_receiving', RECEIVING:'receiving' }
  const CONTACT = { PLAYER:'player', FLOOR:'floor' };
  const ACTION = {
    SERVE:'serve', ACE:'ace', SERVICE_ERROR:'service error',
    DIG:'dig', RECEPTION_ERROR:'reception error',
    PASS:'pass', PASSING_ERROR:'passing error',
    ATTACK:'attack', KILL:'kill', ATACKING_ERROR:'attacking error',
    BLOCK:'block', BLOCKING_ERROR:'blocking error',
    VIOLATION:'violation',
  }

  const on_new_match = (serving) => {
    reset_match(match);
    console.log('starting new match:', match);
    recording = true;
    current.rally = new_rally(serving);
    current.specifiers = specifiers[serving];
    console.log(`starting new rally, ${serving} team serving..`);
    console.log('rally:', current.rally);
  }

  const reset_match = (m) => {
    m.score.home = 0;
    m.score.away = 0;
    m.sets.forEach(s => s.splice(0));
  }

  const new_rally = (serving) => ({
    state: RALLY_STATE.SERVING,
    attacking_team: serving,
    contacts: [],
  })

  const needs_specifier = (contact, rally) => {
    if (is_net_area(contact.area_id)) { return false; }
    if (rally.state === RALLY_STATE.SERVING && !is_service_area(contact.area_id, rally.attacking_team)) { return false; }
    return true;
  }

  const specify = (type, jersey=null) => {
    specifying = false;
    console.log(`specifying a ${type} contact${jersey ? ` (Jersey #${jersey})` : ''}`);
    current.contact.type = type;
    current.contact.player = jersey;
    process_contact(current);
  }

  const set_menu_props = ({el_x:x, el_y:y, el_rect}) => {
    const {width:w, height:h} = el_rect;
    const tb = (y < h/2) ? 'top'  : 'bottom';
    const lr = (x < w/2) ? 'left' : 'right';
    const k = 80; // FIXME: where is this vertical offset coming from?
    menu_origin = `${tb} ${lr}`;
    menu_offset.dx = lr === 'left' ? x : w-x;
    menu_offset.dy = tb === 'top'  ? y-k : h-y+k;
  }

  const is_out = (area) => (area.startsWith(`free-top`) || area.startsWith(`free-bottom`));

  const is_net_area = (area) => area.startsWith('net-');

  const is_blocking_area = (area, team) => area.startsWith(`block-${team}`);

  const is_service_area = (area, team) => area.startsWith(`free-${team}`);

  const is_court_area = (area, team) => area.startsWith(`court-${team}`);

  const other_team = (team) => (team === TEAM.HOME) ? TEAM.AWAY : TEAM.HOME;

  const attacking_team = (rally) => rally.attacking_team;

  const defending_team = (rally) => other_team(rally.attacking_team);

  const process_contact = ({contact, rally, match}) => {
    console.log(`processing contact with ${contact.area_id}`);
    // if contact is valid, record to rally: rally.contacts.push(contact);
    // determine action
    // if rally complete..
    //   add rally to set: match.sets[current.set_index].push(current.rally)
    //   update score
    //   start new rally with correct server
    // if set complete..
    //   is game complete?
    //   update set index
    //   start new rally with correct server
    let is_valid = true;
    let rally_ends = true;
    let next_team = rally.attacking_team; // default to same team
    let action;
    switch (rally.state) {
      case RALLY_STATE.SERVING:
        if (!is_service_area(contact.area_id, rally.attacking_team)) {
          is_valid = false;
          console.log(`invalid contact; expected service area of ${rally.attacking_team} team`);
        }
        else {
          action = ACTION.SERVE;
          rally.state = RALLY_STATE.SERVE_RECEIVING;
          rally_ends = false;
        }
      break;

      case RALLY_STATE.SERVE_RECEIVING:
        if (is_court_area(contact.area_id, rally.attacking_team)
          || is_blocking_area(contact.area_id, rally.attacking_team)) {
          console.log('service error, ball contact on serving team court');
          action = ACTION.SERVICE_ERROR;
          // point for defending team
          next_team = other_team(rally.attacking_team);
        }
        if (is_net_area(contact.area_id)) {
          console.log('service error, net contact');
          action = ACTION.SERVICE_ERROR;
          // point for defending team
          next_team = other_team(rally.attacking_team);
        }
        if (is_out(contact.area_id)) {
          console.log(`service error, unless defending team touched it; check contact type (${contact.type})`);
          // if defender touched it:
          // rally_ends = false;
          // action = ACTION.DIG
          // next_team = other_team(rally.attacking_team);

        }
        if (is_blocking_area(contact.area_id, defending_team(rally))) {
          console.log('reception error; cannot block a serve');
          action = ACTION.RECEPTION_ERROR;
          // point for attacking team
        }
        if (is_court_area(contact.area_id, defending_team(rally))) {
          console.log(`some kind of reception; check contact type (${contact.type})`);
          // if proper reception:
          // count 1 hit
          rally_ends = false;
          next_team = other_team(rally.attacking_team);
        }
      break;

      case RALLY_STATE.RECEIVING:
        if (is_court_area(contact.area_id, rally.attacking_team)
          || is_blocking_area(contact.area_id, rally.attacking_team)) {
          console.log('attack, block, pass, or error; ball contact on attacking team court');
          // check count and previous action
          action = ACTION.ATTACK_ERROR;
          // point for defending team
          next_team = other_team(rally.attacking_team);
        }
        if (is_net_area(contact.area_id)) {
          console.log('attack, block, or pass error; ball contact with net');
          action = ACTION.ATTACK_ERROR;
          // point for defending team
          next_team = other_team(rally.attacking_team);
        }
        if (is_out(contact.area_id)) {
          console.log(`attack, block, or pass error, unless attacking team touched it and has hits left; check contact type (${contact.type})`);
          // if attacker touched it:
          // rally_ends = false;
          // action = ACTION.DIG
          // next_team = other_team(rally.attacking_team);
        }
        if (is_blocking_area(contact.area_id, defending_team(rally))) {
          console.log(`block or attack attempt if person (check next contact), attack, block, or pass error if floor; check contact type (${contact.type})`);
          // action gets set after next analysis?
        }
        if (is_court_area(contact.area_id, defending_team(rally))) {
          console.log(`pass or attack attempt if person (check next contact), attack, block, or pass error if floor; check contact type (${contact.type})`);
          // if proper reception:
          // count 1 hit
          rally_ends = false;
          action = ACTION.DIG
        }
      break;
    }

    if (is_valid) {
      if (action) {
        contact.action = action;
        console.log(`action: ${contact.action.toUpperCase()}`);
      }
      else { console.log('no action'); }
      rally.contacts.push(contact);
      current.specifiers = specifiers[next_team];
      if (rally_ends) {
        console.log('rally ends');
        console.log(`starting new rally, ${next_team} team serving..`);
        current.rally = new_rally(next_team);
        current.rally.state = RALLY_STATE.SERVING;
        // award a point
      }
      else { console.log('rally continues'); }
      // match ends?
      console.log('rally:', current.rally);
    }
  }

  const on_contact = (e) => {
    if (specifying) { specifying = false; console.log('specify cancelled'); return; }
    if (!recording) { console.log('not in recording mode'); return; }

    const contact = e.detail;
    const {area_id, court_x, court_y, screen_x, screen_y} = contact;
    console.log(`contact with ${area_id} at [${contact.el_x}, ${contact.el_y}]`);

    current.contact = contact;
    if (needs_specifier(current.contact, current.rally)) {
      specifying = true;
      set_menu_props(current.contact);
    }
    else {
      contact.source_event.stopPropagation();
      process_contact(current);
    }
  }

  let recording = false;
  let specifying = false;
  let action_log = [];
  let match = { score: { home:0, away:0 }, sets: [[],[],[]]};
  let current = { set_index:-1, rally:null, contact:null, specifiers:null };
  let menu_width, menu_height; // read-only
  let menu_offset = { dx:0, dy:0 };
  let menu_origin = "top left";

  let specifiers = {
    'home':{
      'groups':[
        [
          { type: CONTACT.PLAYER, value:'01' },
          { type: CONTACT.PLAYER, value:'02' },
          { type: CONTACT.PLAYER, value:'03' },
          { type: CONTACT.PLAYER, value:'04' },
        ],
        [
          { type: CONTACT.PLAYER, value:'05' },
          { type: CONTACT.PLAYER, value:'06' },
          { type: CONTACT.PLAYER, value:'07' },
          { type: CONTACT.PLAYER, value:'08' },
        ],
        [
          { type: CONTACT.PLAYER, value:'09' },
          { type: CONTACT.PLAYER, value:'10' },
          { type: CONTACT.PLAYER, value:'11' },
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

  onMount(async () => {
    // TODO: move this to a `New Match` button that prompts for serving team
    on_new_match(TEAM.HOME);
  });
</script>

<style>
  .widener > :global(:first-child) { width:100%; } /* feels hacky, but not sure how else to get the menu to fill available space, so it doesn't constrict the court */
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
    <Button class='menu-item' on:click={()=>specify(s.type, s.value)}>#{s.value}</Button>
  {/each}
  </ButtonGroup></li>
  {/each}
  <hr />
  {#each specifiers.both as s}
  <Menuitem on:click={()=>specify(s.type, s.value)}>{s.value}</Menuitem>
  {/each}
</Menu>
</div>
