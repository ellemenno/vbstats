import { readable, writable } from 'svelte/store';

// readables
export const TEAM = readable(
  { HOME:'home', AWAY:'away' },
  () => {}
);

export const CONTACT = readable(
  { PLAYER:'player', FLOOR:'floor' },
  () => {}
);

export const ACTION = readable(
  {
    SERVE:'serve', ACE:'ace', SERVICE_ERROR:'service error',
    DIG_OR_ATTACK:'dig_or_attack', DIG:'dig', RECEPTION_ERROR:'reception error',
    PASS_OR_ATTACK:'pass_or_attack', PASS:'pass', PASSING_ERROR:'passing error',
    ATTACK:'attack', KILL:'kill', ATTACKING_ERROR:'attacking error',
    BLOCK_OR_ATTACK:'block_or_attack', BLOCK:'block', BLOCK_KILL:'block kill', BLOCKING_ERROR:'blocking error',
    VIOLATION:'violation',
  },
  () => {}
);


// writables
export const match = writable([]); // array of sets .. array of rallies .. array of contacts
