/* Whether this visitor has found the game. Kept in the browser only; blocked storage simply means "not found". */
const KEY = 'nf-found';
export function foundEgg() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
export function markEggFound() {
  try { localStorage.setItem(KEY, '1'); } catch { /* storage blocked */ }
}
