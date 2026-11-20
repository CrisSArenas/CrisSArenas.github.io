// NEON FURNACE: prove every district can be finished and every Overdrive arena is sound.
// Usage: node tests/furnace-levels.js
const { NF_DISTRICTS, nfBuild, nfCheck, nfArena, nfDaily } = require('../tools/neon-furnace/levels.js');
let failed = 0;
const ok = (cond, name, detail) => { console.log(`  ${cond ? 'pass' : 'FAIL'}  ${name}${cond ? '' : '\n        ' + detail}`); if (!cond) failed++; };
console.log('\nDistricts');
for (const D of NF_DISTRICTS) {
  const W = nfBuild(D), p = nfCheck(W);
  const keys = new Set(W.gates.map(g => g.key));
  ok(p.length === 0, `${D.name}: finishable, every key, enemy and shard reachable (${W.boxes.length} boxes, ${W.enemies.length} enemies, ${W.items.filter(i => i.t === 'shard').length} shards, gates ${[...keys].join('') || 'none'})`, p.join('; '));
  const shards = D.islands.filter(i => i[6].shard).length;
  ok(W.items.filter(i => i.t === 'shard').length === shards, `${D.name}: all ${shards} data shards placed`, '');
}
ok(NF_DISTRICTS.length === 5, 'five districts', NF_DISTRICTS.length);
ok(nfBuild(NF_DISTRICTS[4]).enemies.some(e => e.t === 'warden'), 'the Spire holds the Warden', '');
ok(JSON.stringify(nfBuild(NF_DISTRICTS[0])) === JSON.stringify(nfBuild(NF_DISTRICTS[0])), 'building is deterministic', '');
console.log('\nOverdrive arenas');
let bad = 0;
for (let s = 1; s <= 100; s++) { const W = nfArena(s * 977); W.exit = { x: W.start.x, y: W.start.y, z: W.start.z }; if (nfCheck(W).length) bad++; }
ok(bad === 0, '100 seeded arenas are sound', bad + ' failed');
const a = nfDaily(new Date(Date.UTC(2026, 10, 20, 1))), b = nfDaily(new Date(Date.UTC(2026, 10, 20, 23)));
ok(a.seed === b.seed && a.twist.id === b.twist.id && a.label === '2026-11-20', 'the daily run is the same all day (UTC)', JSON.stringify([a, b]));
ok(nfDaily(new Date(Date.UTC(2026, 10, 21, 1))).seed !== a.seed, 'the next day is different', '');
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
