// NEON FURNACE in a real browser: every district loads and renders, and the moves, the fights, the gadgets, the
// gates, the uplink, the boss, Overdrive, the daily run, pause and the phone controls all work, with no errors.
// Usage: serve the repo root on :8765 (python3 -m http.server 8765), then node tests/furnace-browser.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const URL = (process.env.BASE || 'http://127.0.0.1:8765') + '/furnace.html?lowres';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let failed = 0;
const ok = (c, name, d = '') => { console.log(`  ${c ? 'pass' : 'FAIL'}  ${name}${c ? '' : '\n        ' + d}`); if (!c) failed++; };
const b = await chromium.launch({ args: ARGS });
const errs = [];
const p = await b.newPage({ viewport: { width: 960, height: 600 } });
p.on('pageerror', e => errs.push(e.message));
await p.route(/cdnjs/, r => r.abort());
await p.goto(URL); await p.evaluate(() => localStorage.removeItem('neonfurnace.v2')); await p.reload();
await p.waitForTimeout(800);
ok(await p.evaluate(() => !!document.getElementById('game').getContext('webgl2')), 'WebGL2 renders the city');
await p.click('#startBtn'); await p.waitForTimeout(400);
ok(await p.evaluate(() => __NF.G.scene === 'title' && __NF.AUDIO.music.on), 'start screen leads to the title, music running');
ok(await p.evaluate(() => __NF.menuItems().find(m => m.label === 'OVERDRIVE').lock), 'Overdrive is locked on a fresh save');
// a frame drawn: the centre of the screen is not black
const lit = async () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => { const c = document.getElementById('game'), g = c.getContext('webgl2'); const px = new Uint8Array(4 * 64);
  g.readPixels((c.width >> 1) - 32, c.height >> 1, 64, 1, g.RGBA, g.UNSIGNED_BYTE, px); let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2]; r(s); })));

console.log('\nDistricts');
for (let n = 0; n < 5; n++) {
  const r = await p.evaluate(async n => { const N = __NF; N.G.skill = 2; N.G.mode = 'campaign'; N.startDistrict(n); await N.wait(0.5);
    return { name: N.G.D.name, enemies: N.G.ents.length, onGround: N.P.onGround, y: N.P.y, gates: N.WORLD.gates.length }; }, n);
  ok(r.onGround && r.enemies > 0 && (await lit()) > 0, `${r.name}: loads, draws, you stand on the deck, ${r.enemies} enemies, ${r.gates} gates`, JSON.stringify(r));
}

console.log('\nMoving');
const mv = await p.evaluate(async () => {
  const N = __NF, P = N.P; N.startDistrict(0); N.G.god = true; for (const e of N.G.ents) e.state = 'idle';
  await N.wait(0.3);
  const z0 = P.z; N.CAM.yaw = Math.PI; N.IN.jumpP = false;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); await N.wait(0.7); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
  const walked = z0 - P.z;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); await N.wait(0.06); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
  await N.wait(0.15); const air = P.y;
  await N.wait(1.2);
  return { walked, air, back: P.onGround };
});
ok(mv.walked > 1.5, 'W walks forward, relative to the camera', JSON.stringify(mv));
ok(mv.air > 0.3 && mv.back, 'Space jumps and you land again', JSON.stringify(mv));
const gr = await p.evaluate(async () => {
  const N = __NF, P = N.P; const a = N.WORLD.anchors.find(a => { const t = N.WORLD.boxes[a.box]; return t.k === 'tower' && t.y1 - t.y0 < 20; });
  const t = N.WORLD.boxes[a.box], cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2, dx = a.x - cx, dz = a.z - cz, l = Math.hypot(dx, dz) || 1;
  P.x = a.x + dx / l * 7; P.z = a.z + dz / l * 7; const g = N.WORLD.boxes.find(b => b.k === 'deck' && P.x >= b.x0 && P.x <= b.x1 && P.z >= b.z0 && P.z <= b.z1); P.y = g.y1; P.vx = P.vz = 0;
  N.CAM.yaw = Math.atan2(a.x - P.x, a.z - P.z); N.CAM.pitch = 0;
  await N.wait(0.2);
  const tg = N.grappleTarget(); N.IN.grappleP = true; await N.wait(2.5);
  await N.wait(1);
  const tb = tg && N.WORLD.boxes[tg.box];
  return { picked: !!tb && tb.k === 'tower', y: P.y, top: tb && tb.y1, onTop: P.onGround && !!tb && Math.abs(P.y - tb.y1) < 0.3 };
});
ok(gr.picked && gr.onTop, 'E grapples to a rooftop and lands on it', JSON.stringify(gr));
const gl = await p.evaluate(async () => {
  const N = __NF, P = N.P; P.vy = 0; P.y += 30; P.onGround = false; P.jumps = 1; P.state = 'move';
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); await N.wait(0.8);
  const g = { gliding: P.gliding, vy: P.vy }; window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); return g;
});
ok(gl.gliding && gl.vy >= -2.5, 'holding Space in the air glides', JSON.stringify(gl));
const vent = await p.evaluate(async () => {
  const N = __NF, P = N.P; N.startDistrict(2); N.G.god = true; await N.wait(0.3);
  const v = N.WORLD.vents[0]; P.x = v.x; P.z = v.z; P.y = v.y + 2; P.vy = -1; P.onGround = false; P.jumps = 1; P.state = 'move';
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); await N.wait(0.9);
  const y = P.y - v.y; window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); return { rose: y };
});
ok(vent.rose > 4, 'an updraft vent lifts a glide', JSON.stringify(vent));

console.log('\nFighting');
const fight = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; N.startDistrict(0); G.god = true; await N.wait(0.3);
  const e = G.ents.find(e => e.type === 'thug'); e.state = 'chase'; e.aware = true; P.x = e.x; P.z = e.z + 3; P.y = e.y;
  const s0 = G.score; let n = 0;
  const k0 = G.kos;
  while (G.kos === k0 && n++ < 60) { N.IN.strikeP = true; await N.wait(0.25); }
  return { dead: G.kos > k0, scored: G.score > s0, combo: G.maxCombo };
});
ok(fight.dead && fight.scored, 'strikes close the distance, land, and knock an enemy out', JSON.stringify(fight));
const ctr = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; const e = G.ents.find(e => e.type === 'thug' && !e.dead); P.state = 'move'; P.x = e.x; P.z = e.z + 2; P.y = e.y;
  e.state = 'windup'; e.st = 0; e.wind = 5; e.counterable = true; e.melee = true; const hp0 = e.hp; N.tryCounter();
  return { state: P.state, hurt: e.hp < hp0 };
});
ok(ctr.state === 'counter' && ctr.hurt, 'counter on a red warning reverses the attack', JSON.stringify(ctr));
const td = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; await N.wait(0.5); const e = G.ents.find(e => e.type === 'thug' && !e.dead && e.island !== 'a') || G.ents.find(e => !e.dead && e.type !== 'drone');
  e.state = 'idle'; e.aware = false; e.yaw = 0; P.state = 'move'; P.x = e.x; P.z = e.z - 1.5; P.y = e.y;
  N.CAM.yaw = 0; N.beginStrike(); await N.wait(0.9); return { st: e.state, dead: e.dead };
});
ok(td.dead, 'striking an unaware enemy from behind is a silent takedown', JSON.stringify(td));
const gad = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; N.startDistrict(1); G.god = true; await N.wait(0.3);
  const d = G.ents.find(e => e.type === 'drone'); P.x = d.x; P.z = d.z + 3; P.y = d.base; P.state = 'move';
  for (const e of G.ents) if (Math.hypot(e.x - P.x, e.z - P.z) < 7) { e.state = 'chase'; e.aware = true; }
  N.IN.empP = true; await N.wait(0.3);
  const droneDown = d.dead;
  const t = G.ents.find(e => !e.dead && e.type !== 'drone'); P.x = t.x; P.z = t.z + 3; P.y = t.y; t.state = 'chase';
  N.IN.smokeP = true; await N.wait(0.2);
  return { droneDown, blind: t.state === 'blind', cdEmp: P.cdEmp > 0, cdSmoke: P.cdSmoke > 0 };
});
ok(gad.droneDown && gad.cdEmp, 'EMP brings drones down', JSON.stringify(gad));
ok(gad.blind && gad.cdSmoke, 'smoke blinds the enemies around you', JSON.stringify(gad));
const disc = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; const e = G.ents.find(e => !e.dead && e.type === 'guard'); P.x = e.x; P.z = e.z + 8; P.y = e.y; P.state = 'move';
  N.CAM.yaw = Math.PI; const hp0 = e.hp; N.IN.discP = true; await N.wait(0.9); return { hit: e.hp < hp0 || e.dead, back: !P.disc };
});
ok(disc.hit && disc.back, 'the disc flies out, hits and comes back', JSON.stringify(disc));

console.log('\nKeys, gates and the uplink');
const gate = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; N.startDistrict(0); G.god = true; await N.wait(0.3);
  const key = N.WORLD.items.find(i => i.t === 'key'); const gb = N.WORLD.boxes[N.WORLD.gates[0].box];
  const lockedBefore = !gb.off; const readyBefore = N.uplinkReady();
  P.x = key.x; P.z = key.z; P.y = key.y - 1; P.vy = 0; await N.wait(2.5);
  return { lockedBefore, readyBefore, got: !!G.keys[key.key], open: !!gb.off, ready: N.uplinkReady() };
});
ok(gate.lockedBefore && !gate.readyBefore, 'the gate is shut and the uplink locked before the key', JSON.stringify(gate));
ok(gate.got && gate.open && gate.ready, 'taking the keycard opens its gate and the uplink', JSON.stringify(gate));
const fin = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; const ex = N.WORLD.W.exit; G.tookDamage = false; G.kos = G.enemyTotal; G.shards = G.shardTotal; G.time = 60;
  P.x = ex.x; P.z = ex.z; P.y = ex.y; await N.wait(0.4);
  return { scene: G.scene, medals: N.SV.medals[0], reached: N.SV.reached, cont: N.SV.cont && N.SV.cont.level };
});
ok(fin.scene === 'tally' && fin.medals === 15 && fin.reached === 1 && fin.cont === 1, 'the uplink ends the district; a clean run earns all four medals and saves', JSON.stringify(fin));
ok(await p.evaluate(() => { __NF.G.scene = 'title'; return !__NF.menuItems().find(m => m.label === 'OVERDRIVE').lock; }), 'finishing district 1 unlocks Overdrive');

console.log('\nThe Warden');
const boss = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; N.startDistrict(4); G.god = true; await N.wait(0.3);
  const w = G.ents.find(e => e.type === 'warden'); P.x = w.x; P.z = w.z + 9; P.y = w.base; w.state = 'chase'; w.aware = true;
  const hp0 = w.hp; N.hitEnemy(w, 1, 'strike'); const immuneHigh = w.hp === hp0;
  w.state = 'stun'; w.st = 0; w.stunFor = 5; w.grounded = true; N.hitEnemy(w, 1, 'strike'); const hurtLow = w.hp < hp0;
  w.hp = w.hpMax * 0.5; await N.wait(0.3); w.state = 'chase'; await N.wait(0.3); const ph = w.phase;
  for (const k of ['B', 'Y']) G.keys[k] = true; const lockedWhileAlive = !N.uplinkReady();
  w.state = 'stun'; w.st = 0; w.grounded = true; N.hitEnemy(w, 999, 'strike'); return { immuneHigh, hurtLow, ph, lockedWhileAlive, dead: w.dead, ready: N.uplinkReady() };
});
ok(boss.immuneHigh && boss.hurtLow, 'the Warden can only be hurt once it is brought to the ground', JSON.stringify(boss));
ok(boss.ph >= 1, 'it changes phase as it breaks', JSON.stringify(boss));
ok(boss.lockedWhileAlive && boss.dead && boss.ready, 'the uplink stays locked until the Warden is down', JSON.stringify(boss));

console.log('\nOverdrive and the daily run');
const od = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; N.startArena('overdrive'); await N.wait(4.6);
  const wave = G.wave, coming = G.ents.length + G.warps.length + G.spawnQ.length;
  G.score = 4321; G.maxCombo = 12; G.god = false; P.inv = 0; N.playerDamage(500); await N.wait(1.8);
  return { wave, coming, scene: G.scene, best: N.SV.od, line: N.shareLine() };
});
ok(od.wave >= 1 && od.coming > 0, 'the first wave arrives through the glitch', JSON.stringify(od));
ok(od.scene === 'odresult' && od.best === 4321, 'going down shows the result and keeps the best score', JSON.stringify(od));
ok(/^NEON FURNACE · OVERDRIVE · Wave \d+ · 4,321 · 12 hit combo$/.test(od.line), 'the share line reads right', od.line);
const daily = await p.evaluate(() => { const N = __NF; N.startArena('daily'); return { mode: N.G.mode, seed: N.G.seed === N.G.daily.seed }; });
ok(daily.mode === 'daily' && daily.seed, "the daily run uses today's seed", JSON.stringify(daily));
ok(await p.evaluate(() => { __NF.G.scene = 'play'; __NF.pause(); return __NF.G.scene === 'paused'; }), 'pause opens the pause menu');

console.log('\nPhone');
const ph = await b.newContext({ ...devices['iPhone 13 landscape'] });
const q = await ph.newPage();
q.on('pageerror', e => errs.push('phone: ' + e.message));
await q.route(/cdnjs/, r => r.abort());
await q.goto(URL);
await q.tap('#startBtn'); await q.waitForTimeout(400);
ok(await q.evaluate(() => __NF.G.touch && document.body.classList.contains('nf-touch')), 'touch is detected');
const box = await q.locator('#game').boundingBox(); const vp = q.viewportSize();
ok(box.height >= vp.height - 2 && Math.abs(box.width / box.height - 16 / 9) < 0.02, 'the game fills the phone screen height at 16:9', JSON.stringify(box));
await q.evaluate(() => { __NF.G.skill = 2; __NF.startCampaign(); __NF.G.god = true; for (const e of __NF.G.ents) e.state = 'idle'; });
await q.waitForTimeout(300);
const before = await q.evaluate(() => [__NF.P.x, __NF.P.z]);
const cdp = await ph.newCDPSession(q);
const pt = (x, y) => [{ x: box.x + box.width * x, y: box.y + box.height * y, id: 1 }];
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(0.15, 0.7) });
for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(0.15, 0.7 - i * 0.025) }); await q.waitForTimeout(80); }
await q.waitForTimeout(300);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const after = await q.evaluate(() => [__NF.P.x, __NF.P.z]);
ok(Math.hypot(after[0] - before[0], after[1] - before[1]) > 0.5, 'the left thumb moves you', JSON.stringify([before, after]));
await ph.close();
ok(errs.length === 0, 'no script errors', errs.join('\n'));
await b.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
