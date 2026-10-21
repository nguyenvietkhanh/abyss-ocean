export const ARENA_DURATION_MS=5*60*1000;
export function arenaRemaining(start:number,now:number){return Math.max(0,ARENA_DURATION_MS-(now-start));}
