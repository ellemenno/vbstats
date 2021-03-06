
export const TEAM = { HOME:'home', AWAY:'away' };

export const CONTACT = { PLAYER:'player', FLOOR:'floor' };

export const ACTION = {
  SERVE:'serve', ACE:'ace', SERVICE_ERROR:'service error',
  DIG_OR_ATTACK:'dig_or_attack', DIG:'dig', RECEPTION_ERROR:'reception error',
  PASS_OR_ATTACK:'pass_or_attack', PASS:'pass', PASSING_ERROR:'passing error',
  ATTACK:'attack', KILL:'kill', ATTACKING_ERROR:'attacking error',
  BLOCK_OR_ATTACK:'block_or_attack', BLOCK:'block', BLOCK_KILL:'block kill', BLOCKING_ERROR:'blocking error',
  VIOLATION:'violation',
};

export const ACTION_POINT = [
  ACTION.ACE, ACTION.BLOCK, ACTION.KILL,
];

export const ACTION_CONTINUE = [
  ACTION.SERVE, ACTION.DIG, ACTION.PASS, ACTION.ATTACK,
];

export const ACTION_ERROR = [
  ACTION.SERVICE_ERROR, ACTION.BLOCKING_ERROR, ACTION.RECEPTION_ERROR,
  ACTION.PASSING_ERROR, ACTION.ATTACKING_ERROR, ACTION.VIOLATION,
];

export const PLAYER_STAT_COLUMNS = [
  CONTACT.PLAYER,
  ...ACTION_POINT,
  ...ACTION_CONTINUE,
  ...ACTION_ERROR,
];
