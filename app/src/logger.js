const is_disabled = false;

export const logger = (prefix='') => {
  const nop = ()=>{};
  return {
    debug: is_disabled ? nop : (msg, ...rest) => console.debug(`${prefix}${msg}`, ...rest),
    info:  is_disabled ? nop : (msg, ...rest) => console.info( `${prefix}${msg}`, ...rest),
    warn:  is_disabled ? nop : (msg, ...rest) => console.warn( `${prefix}${msg}`, ...rest),
    error: is_disabled ? nop : (msg, ...rest) => console.error(`${prefix}${msg}`, ...rest),
  }
}
