// NEON FURNACE: prove every level can be finished and every Overdrive arena is connected.
// Usage: node tests/furnace-levels.js
const { NF_LEVELS, nfCheckLevel, nfArena, nfDaily } = require('../tools/neon-furnace/levels.js');
let failed = 0;
const ok = (cond, name, detail) => { console.log(`  ${cond ? 'pass' : 'FAIL'}  ${name}${cond ? '' : '\n        ' + detail}`); if (!cond) failed++; };
console.log('\nCampaign levels');
for (const L of NF_LEVELS) { const p = nfCheckLevel(L); ok(p.length === 0, `${L.name} is finishable, 100% reachable`, p.join('; ')); }
ok(NF_LEVELS.length === 5, 'five levels', NF_LEVELS.length);
ok(NF_LEVELS[4].rows.some(r => r.includes('d')) && NF_LEVELS[4].rows.some(r => r.includes('o')), 'the Spire has the Warden and the core lock', '');
console.log('\nOverdrive arenas');
let bad = 0;
for (let s = 1; s <= 300; s++) { const rows = nfArena(s * 977); const p = nfCheckLevel({ rows }).filter(x => !/exit/.test(x)); if (p.length) bad++; }
ok(bad === 0, '300 seeded arenas are sealed and fully connected', bad + ' failed');
ok(JSON.stringify(nfArena(42)) === JSON.stringify(nfArena(42)), 'same seed, same arena', '');
const a = nfDaily(new Date(Date.UTC(2026, 10, 20, 1))), b = nfDaily(new Date(Date.UTC(2026, 10, 20, 23)));
ok(a.seed === b.seed && a.twist.id === b.twist.id && a.label === '2026-11-20', 'the daily run is the same all day (UTC)', JSON.stringify([a, b]));
const c = nfDaily(new Date(Date.UTC(2026, 10, 21, 1)));
ok(c.seed !== a.seed, 'the next day is different', '');
ok(a.weapons[0] === 0 && a.weapons.length === 3, 'daily loadout is the sidearm plus two', JSON.stringify(a.weapons));
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
