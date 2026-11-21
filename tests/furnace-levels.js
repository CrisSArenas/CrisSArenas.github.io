// NEON FURNACE: prove every district and challenge can be finished, and every arena is sound.
// Usage: node tests/furnace-levels.js
const L = require('../tools/neon-furnace/levels.js');
const { NF_DISTRICTS, NF_CHALLENGES, nfBuild, nfCheck, nfArena, nfDaily, nfWeekly, nfChallenge } = L;
let failed = 0;
const ok = (cond, name, detail) => { console.log(`  ${cond ? 'pass' : 'FAIL'}  ${name}${cond ? '' : '\n        ' + detail}`); if (!cond) failed++; };
console.log('\nDistricts');
for (const D of NF_DISTRICTS) {
  const W = nfBuild(D), p = nfCheck(W);
  const cnt = t => W.items.filter(i => i.t === t).length;
  ok(p.length === 0, `${D.name}: finishable; keys, ${W.enemies.length} enemies, the boss and every secret reachable`, p.join('; '));
  const want = D.islands.flatMap(i => i[6].hide || []);
  ok(cnt('shard') === want.filter(h => h.startsWith('shard')).length && cnt('tag') === want.filter(h => h.startsWith('tag')).length && cnt('radio') === want.filter(h => h.startsWith('radio')).length,
    `${D.name}: ${cnt('shard')} shards, ${cnt('tag')} tags, ${cnt('radio')} radio placed`, JSON.stringify(want));
  ok(W.bosses.length === 1, `${D.name}: one boss (${W.bosses.map(b => b.t)})`, '');
}
ok(NF_DISTRICTS.every(D => { const W = nfBuild(D); return W.items.filter(i => i.t === 'shard').length === 2 && W.items.filter(i => i.t === 'tag').length === 3 && W.items.filter(i => i.t === 'radio').length === 1; }), 'every district hides 2 shards, 3 tags and a radio', '');
ok(JSON.stringify(nfBuild(NF_DISTRICTS[0])) === JSON.stringify(nfBuild(NF_DISTRICTS[0])), 'building is deterministic', '');
const sp = nfBuild(NF_DISTRICTS[4]); const el = sp.movers.find(m => m.type === 'elevator');
ok(el && el.key === 'Y' && el.p1[1] - el.p0[1] > 30, 'the Spire elevator needs the yellow key and climbs over 30 metres', JSON.stringify(el));
const noY = Object.assign({}, sp, { items: sp.items.filter(i => !(i.t === 'key' && i.key === 'Y')) });
ok(nfCheck(noY).some(x => /exit not reachable/.test(x)), 'without the yellow key the Warden cannot be reached', '');
console.log('\nChallenges');
for (const C of NF_CHALLENGES) { const W = nfChallenge(C); W.exit = W.exit || { x: W.start.x, y: W.start.y, z: W.start.z }; const p = nfCheck(W);
  ok(p.length === 0 && (C.type !== 'glide' || W.rings.length >= 8), `${C.name} (${C.type}) is sound`, p.join('; ')); }
console.log('\nArenas, the daily run and the weekly gauntlet');
let bad = 0;
for (let s = 1; s <= 100; s++) { const W = nfArena(s * 977); W.exit = { x: W.start.x, y: W.start.y, z: W.start.z }; if (nfCheck(W).length) bad++; }
ok(bad === 0, '100 seeded arenas are sound', bad + ' failed');
const a = nfDaily(new Date(Date.UTC(2026, 10, 20, 1))), b = nfDaily(new Date(Date.UTC(2026, 10, 20, 23)));
ok(a.seed === b.seed && a.twist.id === b.twist.id && a.label === '2026-11-20', 'the daily run is the same all day (UTC)', '');
const w1 = nfWeekly(new Date(Date.UTC(2026, 10, 16))), w2 = nfWeekly(new Date(Date.UTC(2026, 10, 22))), w3 = nfWeekly(new Date(Date.UTC(2026, 10, 23)));
ok(w1.key === w2.key && w1.key !== w3.key, 'the weekly gauntlet runs Monday to Sunday', JSON.stringify([w1.label, w2.label, w3.label]));
ok(w1.waves.length === 10 && w1.waves[4] === 'BOSS:chain' && w1.waves[9] === 'BOSS:atlas', 'ten waves, with bosses at five and ten', '');
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
