<script>
  import { onMount } from 'svelte';
  import { Menu, Menuitem } from 'svelte-mui';
  import Court from "./Court.svelte";

  const TEAM = { HOME:'home', AWAY:'away' }
  const RALLY_STATE = { SERVING:'serving', RECEIVING:'receiving', BLOCKING:'blocking' }
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

  const needs_specifier = (contact) => true;

  const specify = (type, jersey=null) => {
    specifying = false;
    console.log(`specifying a ${type} contact${jersey ? ` (Jersey #${jersey})` : ''}`);
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

  const other_team = (team) => team === TEAM.HOME ? TEAM.AWAY : TEAM.HOME;

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
    switch (rally.state) {
      case RALLY_STATE.SERVING:
        if (!is_service_area(contact.area_id, rally.attacking_team)) {
          is_valid = false;
          console.log('invalid contact; expected service area');
        }
        else {
          contact.action = ACTION.SERVE;
          rally.state = RALLY_STATE.RECEIVING;
          rally.attacking_team = other_team(rally.attacking_team);
          console.log('action:', contact.action);
        }
      break;

      case RALLY_STATE.RECEIVING:
      break;

      case RALLY_STATE.BLOCKING:
      break;
    }
    if (is_valid) { rally.contacts.push(contact); }
    console.log('rally:', rally);
  }

  const on_contact = (e) => {
    if (specifying) { specifying = false; console.log('specify cancelled'); return; }
    if (!recording) { console.log('not in recording mode'); return; }

    const {area_id, court_x, court_y, screen_x, screen_y} = e.detail;
    console.log(`contact with ${area_id} at [${e.detail.el_x}, ${e.detail.el_y}]`);

    current.contact = e.detail;
    if (needs_specifier(current.contact)) {
      specifying = true;
      set_menu_props(current.contact);
    }
    else { process_contact(current); }
  }

  let recording = false;
  let specifying = false;
  let match = { score: { home:0, away:0 }, sets: [[],[],[]]};
  let current = { set_index:-1, rally:null, contact:null };
  let menu_width, menu_height; // read-only
  let menu_offset = { dx:0, dy:0 };
  let menu_origin = "top left";

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

  <Menuitem on:click={()=>specify(CONTACT.PLAYER, 2)}>Jersey #2</Menuitem>
  <Menuitem on:click={()=>specify(CONTACT.PLAYER, 3)}>Jersey #3</Menuitem>
  <Menuitem on:click={()=>specify(CONTACT.PLAYER, 4)}>Jersey #4</Menuitem>
  <hr />
  <Menuitem on:click={()=>specify(CONTACT.FLOOR)}>Floor</Menuitem>
</Menu>
</div>
