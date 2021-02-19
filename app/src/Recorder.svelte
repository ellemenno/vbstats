<script>
  import Court from "./Court.svelte";
  import { onMount } from 'svelte';

  const TEAM = { HOME:'home', AWAY:'away' }
  const RALLY_STATE = { SERVING:'serving', RECEIVING:'receiving', BLOCKING:'blocking' }
  const ACTION = {
    SERVE:'serve', ACE:'ace', SERVICE_ERROR:'service error',
    DIG:'dig', RECEPTION_ERROR:'reception error',
    PASS:'pass', PASSING_ERROR:'passing error',
    ATTACK:'attack', KILL:'kill', ATACKING_ERROR:'attacking error',
    BLOCK:'block', BLOCKING_ERROR:'blocking error',
    VIOLATION:'violation',
  }
  const CONTACT = {
    PLAYER_HOME:'player_home', PLAYER_AWAY:'player_away',
    FLOOR_COURT_HOME:'floor_court_home', FLOOR_COURT_AWAY:'floor_court_away', FLOOR_OUT:'floor_out',
    NET:'net',
  }

  const match = { score: { home:0, away:0 }, sets: [[],[],[]]};

  let set_index = -1;
  let recording = false;
  let rally;

  const on_new_match = (serving) => {
    reset_match(match);
    console.log('starting new match:', match);
    recording = true;
    rally = new_rally(serving);
    console.log(`starting new rally, ${serving} team serving..`);
    console.log('rally:', rally);
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

  const is_out = (area) => (area.startsWith(`free-top`) || area.startsWith(`free-bottom`));

  const is_net_area = (area) => area.startsWith('net-');

  const is_blocking_area = (area, team) => area.startsWith(`block-${team}`);

  const is_service_area = (area, team) => area.startsWith(`free-${team}`);

  const is_court_area = (area, team) => area.startsWith(`court-${team}`);

  const other_team = (team) => team === TEAM.HOME ? TEAM.AWAY : TEAM.HOME;

  const attacking_team = (rally) => rally.attacking_team;

  const defending_team = (rally) => other_team(rally.attacking_team);

  const process_contact = (contact, rally, match) => {
    console.log(`processing contact with ${contact.area_id}`);
    // if contact is valid, record to rally: rally.contacts.push(contact);
    // determine action
    // if rally complete..
    //   add rally to set: match.sets[set_index].push(rally)
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
    if (!recording) { console.log('not in recording mode'); return; }

    const {area_id, court_x, court_y, screen_x, screen_y} = e.detail;
    // console.log(`contact with ${area_id} at:\ncourt [${court_x}, ${court_y}]\nscreen [${screen_x}, ${screen_y}]`);
    const contact = e.detail;
    process_contact(contact, rally, match);
  }

  onMount(async () => {
    // TODO: move this to a `New Match` button that prompts for serving team
    on_new_match(TEAM.HOME);
  });
</script>

<style>
</style>

<h1>record a match</h1>

<Court on:contact={on_contact}/>
