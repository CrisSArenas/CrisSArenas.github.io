// NEON FURNACE in a real browser: every level loads and plays, scoring, medals, Overdrive, the daily run,
// pause and the phone controls, with no script errors.
// Usage: serve the repo root on :8765 (python3 -m http.server 8765), then node tests/furnace-browser.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const URL = (process.env.BASE || 'http://127.0.0.1:8765') + '/furnace.html';
let failed = 0;
const ok = (c, name, d = '') => { console.log(`  ${c ? 'pass' : 'FAIL'}  ${name}${c ? '' : '\n        ' + d}`); if (!c) failed++; };
const b = await chromium.launch();
const errs = [];
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('pageerror', e => errs.push(e.message));
await p.goto(URL); await p.evaluate(() => localStorage.removeItem('neonfurnace.v1')); await p.reload();
await p.click('#startBtn'); await p.waitForTimeout(300);
ok(await p.evaluate(() => __NF.G.scene === 'title' && __NF.AUDIO.music.on), 'start screen leads to the title, music running');
ok(await p.evaluate(() => __NF.menuItems().find(m => m.label === 'OVERDRIVE').lock), 'Overdrive is locked on a fresh save');

console.log('\nCampaign');
await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
ok(await p.evaluate(() => __NF.G.scene === 'play' && __NF.G.level === 0), 'New game starts level 1');
for (let n = 0; n < 5; n++) {
  const r = await p.evaluate(async n => {
    const N = __NF, G = N.G; N.startLevel(n, true); G.god = true;
    G.has = [true, true, true, true, true]; G.ammo = { bul: 250, shl: 80, cel: 400 };
    await new Promise(r => setTimeout(r, 400));
    // stand next to the first enemy and shoot it until it drops
    const e = G.ents.find(e => e.kind === 'enemy'); const before = G.score;
    G.px = e.x - 1.2; G.py = e.y; e.x = G.px + 1.2;
    for (let i = 0; i < 400 && !e.dead; i++) { G.pa = Math.atan2(e.y - G.py, e.x - G.px); G.cool = 0; G.wep = 2; N.fire(); }
    return { dead: !!e.dead, scored: G.score > before, name: G.L.name };
  }, n);
  ok(r.dead && r.scored, `${r.name}: loads, an enemy goes down and scores`, JSON.stringify(r));
}
const combo = await p.evaluate(() => {
  const N = __NF, G = N.G; N.startLevel(0, true); G.god = true; G.combo = 0; G.comboT = 0;
  const es = G.ents.filter(e => e.kind === 'enemy').slice(0, 3);
  for (const e of es) N.damageEnemy(e, 9999, 3, 'player');
  return G.combo;
});
ok(combo === 3, 'three quick kills make a ×3 combo', combo);
const tally = await p.evaluate(() => {
  const N = __NF, G = N.G; N.startLevel(0, true); G.tookDamage = false; G.kills = G.killsTotal; G.secrets = G.secretsTotal; G.time = 30;
  N.finishLevel(); return { scene: G.scene, medals: N.SV.medals[0], reached: N.SV.reached, snap: N.SV.snap && N.SV.snap.level };
});
ok(tally.scene === 'tally' && tally.medals === 15 && tally.reached === 1 && tally.snap === 1, 'a perfect level earns all four medals and saves progress', JSON.stringify(tally));
await p.screenshot({ path: process.env.SHOTS ? process.env.SHOTS + '/t-tally.png' : '/dev/null' }).catch(() => {});
ok(await p.evaluate(() => !__NF.menuItems ? false : (__NF.G.scene = 'title', !__NF.menuItems().find(m => m.label === 'OVERDRIVE').lock)), 'finishing level 1 unlocks Overdrive');
const boss = await p.evaluate(() => {
  const N = __NF, G = N.G; N.startLevel(4, true); G.god = true;
  const w = G.ents.find(e => e.type === 'warden'); const lock = [...G.doors.values()].find(d => d.need === 'O');
  N.damageEnemy(w, 99999, 5, 'player');
  return { dead: !!w.dead, opened: lock.need === null && lock.state === 1 };
});
ok(boss.dead && boss.opened, 'killing the Warden opens the core lock', JSON.stringify(boss));

console.log('\nOverdrive and the daily run');
const od = await p.evaluate(async () => {
  const N = __NF, G = N.G; N.startArena('overdrive');
  await new Promise(r => setTimeout(r, 3600));
  const wave = G.wave, spawned = G.ents.filter(e => e.kind === 'enemy' || e.kind === 'warp').length + G.spawnQ.length;
  G.score = 4321; G.maxCombo = 3; G.god = false; G.armor = 0; N.hurtPlayer(500);
  await new Promise(r => setTimeout(r, 1700));
  return { wave, spawned, scene: G.scene, best: N.SV.od, line: N.shareLine() };
});
ok(od.wave >= 1 && od.spawned > 0, 'the first wave arrives', JSON.stringify(od));
ok(od.scene === 'odresult' && od.best === 4321, 'dying shows the result and saves the best score', JSON.stringify(od));
ok(/^NEON FURNACE · OVERDRIVE · Wave \d+ · 4,321 · x3 max$/.test(od.line), 'the share line reads right', od.line);
const daily = await p.evaluate(() => { const N = __NF; N.startArena('daily'); const G = N.G; return { mode: G.mode, has: G.has.filter(Boolean).length, seed: G.seed === G.daily.seed }; });
ok(daily.mode === 'daily' && daily.has === 3 && daily.seed, 'the daily run uses today\'s seed and a three-weapon loadout', JSON.stringify(daily));
ok(await p.evaluate(() => { __NF.pause(); return __NF.G.scene === 'paused'; }), 'pause opens the pause menu');

console.log('\nPhone');
const ph = await b.newContext({ ...devices['iPhone 13 landscape'] });
const q = await ph.newPage();
q.on('pageerror', e => errs.push('phone: ' + e.message));
await q.goto(URL);
await q.tap('#startBtn'); await q.waitForTimeout(300);
ok(await q.evaluate(() => __NF.G.touch && document.body.classList.contains('nf-touch')), 'touch is detected');
const box = await q.locator('#game').boundingBox();
const vp = q.viewportSize();
ok(box.height >= vp.height - 2 && Math.abs(box.width / box.height - 1.6) < 0.02, 'the game fills the phone screen height and keeps its shape', JSON.stringify(box));
await q.evaluate(() => { __NF.startCampaign(); });
await q.waitForTimeout(300);
const before = await q.evaluate(() => [__NF.G.px, __NF.G.py]);
// drag the left thumb forward for half a second
const cdp = await ph.newCDPSession(q);
const pt = (x, y) => [{ x: box.x + box.width * x, y: box.y + box.height * y, id: 1 }];
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(0.15, 0.6) });
for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(0.15, 0.6 - i * 0.02) }); await q.waitForTimeout(60); }
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const after = await q.evaluate(() => [__NF.G.px, __NF.G.py]);
ok(Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.3, 'the left thumb moves the player', JSON.stringify([before, after]));
await ph.close();
ok(errs.length === 0, 'no script errors', errs.join('\n'));
await b.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
