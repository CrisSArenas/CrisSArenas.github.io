// NEON FURNACE 4 in a real browser: every district loads and renders with its boss, and the story scenes, the moves,
// the fights, the enemy types, the gadgets, the gates, the uplink, the bosses, XP and upgrades, the challenges,
// Overdrive, the daily run, the weekly gauntlet, the high-score tables, the map, pause and the phone controls all
// work, with no errors.
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
const p = await b.newPage({ viewport: { width: 800, height: 500 } });
p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
await p.route(/cdnjs|fonts\.g/, r => r.abort());
await p.goto(URL); await p.evaluate(() => localStorage.removeItem('neonfurnace.v4')); await p.reload();
await p.waitForTimeout(800);
ok(await p.evaluate(() => !!document.getElementById('game').getContext('webgl2')), 'WebGL2 renders the city');
await p.click('#startBtn'); await p.waitForTimeout(400);
ok(await p.evaluate(() => __NF.G.scene === 'title' && __NF.AUDIO.music.on), 'start screen leads to the title, music running');
ok(await p.evaluate(() => ['CHALLENGES', 'OVERDRIVE', 'DAILY RUN', 'WEEKLY GAUNTLET'].every(l => __NF.menuItems().find(m => m.label === l).lock)),
  'challenges and the score modes are locked on a fresh save');
const lit = async () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => { const c = document.getElementById('game'), g = c.getContext('webgl2'); const px = new Uint8Array(4 * 64);
  g.readPixels((c.width >> 1) - 32, c.height >> 1, 64, 1, g.RGBA, g.UNSIGNED_BYTE, px); let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2]; r(s); })));

console.log('\nDistricts and the story');
const intro = await p.evaluate(async () => { const N = __NF; N.G.skill = 2; N.startCampaign(); const sc = N.G.scene, title = N.G.cut && N.G.cut.title;
  N.endCut(); await N.wait(0.2); return { sc, title, after: N.G.scene, radio: N.G.radioQ.length, who: N.G.radioQ[0] && N.G.radioQ[0].who }; });
ok(intro.sc === 'cut' && /DISTRICT 1/.test(intro.title), 'a district opens with an in-engine scene', JSON.stringify(intro));
ok(intro.after === 'play' && intro.radio > 0 && intro.who === 'mira', 'skipping it starts play, and Mira comes on the radio', JSON.stringify(intro));
const bossNames = ['chain', 'twin', 'hammer', 'atlas', 'warden'];
for (let n = 0; n < 5; n++) {
  const r = await p.evaluate(async n => { const N = __NF; N.G.skill = 2; N.startDistrict(n); N.endCut(); await N.wait(0.5);
    return { name: N.G.D.name, enemies: N.G.ents.filter(e => !e.boss).length, bosses: N.G.ents.filter(e => e.boss).map(e => e.type), civs: N.G.civs.length,
      onGround: N.P.onGround, tags: N.WORLD.items.filter(i => i.t === 'tag').length, radio: N.WORLD.items.filter(i => i.t === 'radio').length }; }, n);
  ok(r.onGround && r.enemies > 0 && r.bosses[0] === bossNames[n] && r.tags === 3 && r.radio === 1 && (await lit()) > 0,
    `${r.name}: draws, ${r.enemies} enemies, boss ${r.bosses.join(' & ')}, ${r.civs} passers-by, 3 tags and a radio`, JSON.stringify(r));
}

console.log('\nMoving');
const mv = await p.evaluate(async () => {
  const N = __NF, P = N.P; N.startDistrict(0); N.endCut(); N.G.god = true; for (const e of N.G.ents) { e.state = 'idle'; e.hidden = true; }
  await N.wait(0.3);
  const z0 = P.z; N.CAM.yaw = Math.PI;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); await N.wait(0.7); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
  const walked = z0 - P.z;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); await N.wait(0.06); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
  await N.wait(0.15); const air = !P.onGround;
  await N.wait(1.4);
  return { walked, air, back: P.onGround };
});
ok(mv.walked > 1.5, 'W runs forward, relative to the camera', JSON.stringify(mv));
ok(mv.air && mv.back, 'Space jumps and you land again', JSON.stringify(mv));
const gr = await p.evaluate(async () => {
  const N = __NF, P = N.P; const a = N.WORLD.anchors.find(a => { const t = N.WORLD.boxes[a.box]; return t && t.k === 'tower' && t.y1 - t.y0 < 20; });
  const t = N.WORLD.boxes[a.box], cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2, dx = a.x - cx, dz = a.z - cz, l = Math.hypot(dx, dz) || 1;
  P.x = a.x + dx / l * 7; P.z = a.z + dz / l * 7; const g = N.WORLD.boxes.find(b => b.k === 'deck' && P.x >= b.x0 && P.x <= b.x1 && P.z >= b.z0 && P.z <= b.z1); P.y = g.y1; P.vx = P.vz = 0;
  N.CAM.yaw = Math.atan2(a.x - P.x, a.z - P.z); N.CAM.pitch = 0; P.state = 'move';
  await N.wait(0.2);
  const tg = N.grappleTarget(); N.IN.grappleP = true; await N.wait(3.5);
  const tb = tg && N.WORLD.boxes[tg.box];
  return { picked: !!tb && tb.k === 'tower', y: P.y, top: tb && tb.y1, onTop: P.onGround && !!tb && P.y > tb.y1 - 0.3 };
});
ok(gr.picked && gr.onTop, 'E grapples to a rooftop and lands on it', JSON.stringify(gr));
const gl = await p.evaluate(async () => {
  const N = __NF, P = N.P; P.vy = 0; P.y += 30; P.onGround = false; P.jumps = 2; P.state = 'move';
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); await N.wait(0.8);
  const g = { gliding: P.gliding, vy: P.vy }; window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); return g;
});
ok(gl.gliding && gl.vy >= -3, 'holding Space in the air glides', JSON.stringify(gl));
const vent = await p.evaluate(async () => {
  const N = __NF, P = N.P; N.startDistrict(2); N.endCut(); N.G.god = true; for (const e of N.G.ents) e.hidden = true; await N.wait(0.3);
  const v = N.WORLD.vents[0]; P.x = v.x; P.z = v.z; P.y = v.y + 2; P.vy = -1; P.onGround = false; P.jumps = 2; P.state = 'move';
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); await N.wait(0.9);
  const y = P.y - v.y; window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); return { rose: y };
});
ok(vent.rose > 4, 'an updraft vent lifts a glide', JSON.stringify(vent));

console.log('\nFighting');
// put one enemy of a given type in front of you on an open deck, everyone else out of the way
const setup = `(t)=>{const N=__NF,P=N.P,G=N.G;N.startDistrict(0);N.endCut();G.god=true;for(const e of G.ents){e.hidden=true;e.dead=true;}
  const I=N.WORLD.W.islands.a;P.x=I.x;P.z=I.z+3;P.y=I.y;P.vx=P.vz=P.vy=0;P.state='move';P.onGround=true;P.cdDisc=P.cdEmp=P.cdSmoke=0;P.yaw=Math.PI;N.CAM.yaw=Math.PI;
  const e=N.makeEnemy(t,I.x,I.y,I.z,'a',true);e.yaw=0;return e;}`;
const fight = await p.evaluate(async s => { const N = __NF, G = N.G; const e = eval(s)('thug'); await N.wait(0.2);
  const s0 = G.score, k0 = G.kos; let n = 0; while (!e.dead && n++ < 40) { N.IN.strikeP = true; await N.wait(0.22); }
  return { dead: e.dead, scored: G.score > s0, combo: G.maxCombo, kos: G.kos - k0 }; }, setup);
ok(fight.dead && fight.scored && fight.combo >= 2, 'strikes chain into a combo and knock an enemy out', JSON.stringify(fight));
const ctr = await p.evaluate(async s => { const N = __NF, P = N.P; const e = eval(s)('thug'); await N.wait(0.1);
  e.state = 'windup'; e.st = 0; e.wind = 5; e.counterable = true; const hp0 = e.hp; N.tryCounter();
  return { state: P.state, hurt: e.hp < hp0 }; }, setup);
ok(ctr.state === 'counter' && ctr.hurt, 'a counter on a red warning reverses the attack', JSON.stringify(ctr));
const td = await p.evaluate(async s => { const N = __NF, P = N.P; const e = eval(s)('thug'); e.state = 'idle'; e.aware = false; e.yaw = Math.PI;
  P.z = e.z + 1.5; N.CAM.yaw = Math.PI; P.yaw = Math.PI; N.beginStrike(); const st = N.P.state; await N.wait(1); return { st, dead: e.dead }; }, setup);
ok(td.st === 'takedown' && td.dead, 'striking an unaware enemy from behind is a silent takedown', JSON.stringify(td));
const sh = await p.evaluate(async s => { const N = __NF; const e = eval(s)('shield'); await N.wait(0.2); e.yaw = Math.atan2(N.P.x - e.x, N.P.z - e.z); e.state = 'chase'; const hp0 = e.hp;
  N.IN.strikeP = true; await N.wait(0.5); return { blocked: e.hp === hp0 }; }, setup);
ok(sh.blocked, 'a riot shield blocks strikes from the front', JSON.stringify(sh));
const br = await p.evaluate(async s => { const N = __NF; const e = eval(s)('brute'); await N.wait(0.2); e.state = 'chase'; const hp0 = e.hp;
  N.IN.strikeP = true; await N.wait(0.5); const armoured = e.hp === hp0;
  e.state = 'windup'; e.st = 0; e.wind = 5; e.counterable = true; N.tryCounter(); const opened = e.state === 'open';
  await N.wait(0.5); N.IN.strikeP = true; await N.wait(0.4); return { armoured, opened, hurt: e.hp < hp0 }; }, setup);
ok(br.armoured && br.opened && br.hurt, 'a brute shrugs off strikes until a counter opens it up', JSON.stringify(br));
const spc = await p.evaluate(async s => { const N = __NF, G = N.G; const e = eval(s)('thug'); G.special = 0; N.trySpecial(); const refused = N.P.state !== 'special';
  G.combo = 7; G.comboT = 2; N.hitEnemy(e, 0, 'strike'); const charged = G.special >= 1; N.P.state = 'move'; N.trySpecial(); const st = N.P.state;
  await N.wait(1.2); return { refused, charged, st, dead: e.dead }; }, setup);
ok(spc.refused && spc.charged && spc.st === 'special' && spc.dead, 'an 8 hit combo charges a special takedown, and V spends it', JSON.stringify(spc));
const gad = await p.evaluate(async s => { const N = __NF, P = N.P, G = N.G; const d = eval(s)('drone'); const t = N.makeEnemy('thug', P.x + 2, P.y, P.z - 2, 'a', true);
  await N.wait(0.1); N.IN.empP = true; await N.wait(0.4); const droneDown = d.dead;
  t.state = 'chase'; N.IN.smokeP = true; await N.wait(0.2);
  return { droneDown, blind: t.state === 'blind', cdEmp: P.cdEmp > 0, cdSmoke: P.cdSmoke > 0 }; }, setup);
ok(gad.droneDown && gad.cdEmp, 'EMP brings drones down', JSON.stringify(gad));
ok(gad.blind && gad.cdSmoke, 'smoke blinds the enemies around you', JSON.stringify(gad));
const disc = await p.evaluate(async s => { const N = __NF, P = N.P; const e = eval(s)('guard'); P.z = e.z + 8; e.state = 'chase';
  const hp0 = e.hp; N.IN.discP = true; await N.wait(1.2); return { hit: e.hp < hp0 || e.dead, back: !P.disc }; }, setup);
ok(disc.hit && disc.back, 'the disc flies out, hits and comes back', JSON.stringify(disc));

console.log('\nKeys, the boss and the uplink');
const gate = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; N.startDistrict(0); N.endCut(); G.god = true; for (const e of G.ents) if (!e.boss) e.hidden = true; await N.wait(0.3);
  const key = N.WORLD.items.find(i => i.t === 'key'); const gt = N.WORLD.gates[0], gb = N.WORLD.boxes[gt.box];
  const lockedBefore = !gb.off;
  P.x = key.x; P.z = key.z; P.y = key.y - 1; P.vy = 0; await N.wait(2.5);
  return { lockedBefore, got: !!G.keys[key.key], open: !!gb.off, stillLocked: !N.uplinkReady(), radio: G.radioQ.some(r => /card|gate/i.test(r.text)) };
});
ok(gate.lockedBefore && gate.got && gate.open, 'the keycard opens its gate', JSON.stringify(gate));
ok(gate.stillLocked && gate.radio, 'the uplink stays locked while the boss stands; Mira reacts on the radio', JSON.stringify(gate));
const chain = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; const c = G.ents.find(e => e.type === 'chain'); P.x = c.x; P.z = c.z + 5; P.y = c.base; P.state = 'move';
  await N.wait(0.4); const intro = G.scene === 'cut' || !!c.introduced; N.endCut();
  const hp0 = c.hp; c.state = 'chase'; N.hitEnemy(c, 1, 'strike'); const immune = c.hp === hp0;
  c.state = 'windup'; c.st = 0; c.wind = 5; c.counterable = true; P.state = 'move'; N.tryCounter(); const opened = c.state === 'open';
  N.hitEnemy(c, 1, 'strike'); const hurt = c.hp < hp0;
  c.state = 'open'; N.hitEnemy(c, 999, 'strike'); await N.wait(0.3);
  return { intro, immune, opened, hurt, dead: c.dead, ready: N.uplinkReady() };
});
ok(chain.intro && chain.immune && chain.opened && chain.hurt, 'Chain gets a boss intro, and only takes damage once a counter opens him', JSON.stringify(chain));
ok(chain.dead && chain.ready, 'with Chain down and the key held, the uplink opens', JSON.stringify(chain));
const fin = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; const ex = N.WORLD.W.exit; G.tookDamage = false; G.kosPlaced = G.enemyTotal; G.shards = G.shardTotal; G.tags = G.tagTotal; G.time = 60;
  const xp0 = N.SV.xp; P.x = ex.x; P.z = ex.z; P.y = ex.y; await N.wait(0.4);
  return { scene: N.G.scene, medals: N.SV.medals[0], reached: N.SV.reached, cont: N.SV.cont && N.SV.cont.level, xp: N.SV.xp > xp0 };
});
ok(fin.scene === 'tally' && fin.medals === 15 && fin.reached === 1 && fin.cont === 1, 'the uplink ends the district; a clean run earns all four medals and saves', JSON.stringify(fin));
ok(fin.xp, 'you earn XP as you play', JSON.stringify(fin));
ok(await p.evaluate(() => { __NF.G.scene = 'title'; return !__NF.menuItems().find(m => m.label === 'OVERDRIVE').lock && !__NF.menuItems().find(m => m.label === 'CHALLENGES').lock; }),
  'finishing district 1 unlocks the challenges and the score modes');
const war = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; N.startDistrict(4); N.endCut(); G.god = true; await N.wait(0.3);
  const w = G.ents.find(e => e.type === 'warden'); P.x = w.x; P.z = w.z + 9; P.y = w.base; w.state = 'chase'; w.aware = true; w.introduced = true;
  const hp0 = w.hp; N.hitEnemy(w, 1, 'strike'); const immuneHigh = w.hp === hp0;
  w.state = 'stun'; w.st = 0; w.stunFor = 5; w.grounded = true; N.hitEnemy(w, 1, 'strike'); const hurtLow = w.hp < hp0;
  w.hp = Math.floor(w.hpMax * 0.6); w.state = 'chase'; w.grounded = false; await N.wait(0.4); return { immuneHigh, hurtLow, phase: w.phase };
});
ok(war.immuneHigh && war.hurtLow, 'the Warden can only be hurt once it is brought to the ground', JSON.stringify(war));
ok(war.phase >= 1, 'it calls in help as it breaks', JSON.stringify(war));

console.log('\nUpgrades and suits');
const up = await p.evaluate(() => { const N = __NF, SV = N.SV; SV.xp = 5000; SV.up = []; N.G.scene = 'upgrades';
  const items = N.menuItems(); const pts = items.filter(i => !i.lock && i.up).length > 0;
  const armour = items.findIndex(i => i.up && i.up.id === 'armor1'); N.G.menu = armour; items[armour].act();
  N.startDistrict(0); N.endCut(); return { pts, owned: SV.up.includes('armor1'), hp: N.P.hpMax, gated: N.menuItems().length >= 0 }; });
ok(up.pts && up.owned && up.hp === 115, 'levels give points; an armour upgrade adds health', JSON.stringify(up));
ok(await p.evaluate(() => { __NF.G.scene = 'upgrades'; const t = __NF.menuItems().find(i => i.up && i.up.id === 'triple'); return t.lock; }), 'upgrades that need another one stay locked until you have it');

console.log('\nChallenges');
const ch = await p.evaluate(async () => { const N = __NF, G = N.G; N.SV.reached = 5; N.startChallenge(NF_CHALLENGES[0]); G.god = true; await N.wait(2.6);
  const wave = G.wave, coming = G.ents.filter(e => !e.dead).length + G.warps.length + G.spawnQ.length;
  G.score = 12500; G.wave = 3; for (const e of G.ents) e.dead = true; G.spawnQ = []; G.warps = []; G.waveState = 'break'; G.waveT = 0; await N.wait(0.3);
  return { wave, coming, scene: G.scene, stars: N.SV.stars.street, result: G.result && G.result.stars }; });
ok(ch.wave === 1 && ch.coming > 0, 'a combat challenge sends its first wave', JSON.stringify(ch));
ok(ch.stars === 2 && ch.result === 2 && (ch.scene === 'initials' || ch.scene === 'result'), 'clearing it scores stars against the thresholds', JSON.stringify(ch));
const sk = await p.evaluate(async () => { const N = __NF, G = N.G; N.startChallenge(NF_CHALLENGES[1]); await N.wait(0.3);
  return { rings: N.WORLD.rings.length, hidden: G.ents.every(e => e.hidden || e.dead), obj: G.mode === 'challenge' }; });
ok(sk.rings === 10 && sk.hidden, 'the glide challenge lays out ten rings with no enemies', JSON.stringify(sk));

console.log('\nOverdrive, daily, weekly and the tables');
const od = await p.evaluate(async () => {
  const N = __NF, P = N.P, G = N.G; N.SV.tables.od = []; N.startArena('overdrive'); await N.wait(3.6);
  const wave = G.wave, coming = G.ents.length + G.warps.length + G.spawnQ.length;
  G.score = 4321; G.maxCombo = 12; G.god = false; P.inv = 0; N.playerDamage(999); await N.wait(2);
  const scene = G.scene; if (scene === 'initials') { G.initials.letters = ['K', 'E', 'Z']; N.initialsDone(); }
  return { wave, coming, scene, after: G.scene, best: N.SV.od, table: N.SV.tables.od[0], line: N.shareLine() };
});
ok(od.wave >= 1 && od.coming > 0, 'the first wave arrives through the glitch', JSON.stringify(od));
ok(od.scene === 'initials' && od.after === 'result' && od.best === 4321, 'going down asks for initials, then shows the result and keeps the best score', JSON.stringify(od));
ok(od.table && od.table.n === 'KEZ' && od.table.v === 4321, 'the score lands in the top-ten table with your initials', JSON.stringify(od.table));
ok(/^NEON FURNACE · OVERDRIVE · Wave \d+ · 4,321 · 12 hit combo$/.test(od.line), 'the share line reads right', od.line);
const daily = await p.evaluate(() => { const N = __NF; N.startArena('daily'); return { mode: N.G.mode, seed: N.G.seed === N.G.daily.seed }; });
ok(daily.mode === 'daily' && daily.seed, "the daily run uses today's seed", JSON.stringify(daily));
const wk = await p.evaluate(async () => { const N = __NF, G = N.G; N.startArena('weekly'); G.god = true; G.wave = 4; G.waveState = 'break'; G.waveT = 0; await N.wait(0.4);
  return { wave: G.wave, boss: G.ents.filter(e => e.boss && !e.dead).map(e => e.type) }; });
ok(wk.wave === 5 && wk.boss.includes('chain'), 'the weekly gauntlet throws a boss at wave five', JSON.stringify(wk));
ok(await p.evaluate(async () => { const N = __NF; N.startDistrict(0); N.endCut(); await N.wait(0.1);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Tab' })); await N.wait(0.2); return N.G.map; }), 'Tab opens the map');
ok(await p.evaluate(() => { __NF.G.map = false; __NF.G.scene = 'play'; __NF.pause(); return __NF.G.scene === 'paused'; }), 'pause opens the pause menu');

console.log('\nController');
// A simulated controller: navigator.getGamepads() returns a pad whose buttons and sticks the test sets.
const pc = await b.newContext({ viewport: { width: 800, height: 500 } });
await pc.addInitScript(() => {
  const mk = () => ({ pressed: false, value: 0 });
  window.__pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)', index: 0, connected: true, mapping: 'standard',
    buttons: Array.from({ length: 17 }, mk), axes: [0, 0, 0, 0], timestamp: 0, rumbles: [],
    vibrationActuator: { type: 'dual-rumble', playEffect(t, o) { window.__pad.rumbles.push(o); return Promise.resolve('complete'); } } };
  navigator.getGamepads = () => [window.__pad];
  window.__press = (i, v = true) => { window.__pad.buttons[i].pressed = v; window.__pad.buttons[i].value = v ? 1 : 0; };
  window.__connect = () => { const ev = new Event('gamepadconnected'); Object.defineProperty(ev, 'gamepad', { value: window.__pad }); window.dispatchEvent(ev); };
});
const g = await pc.newPage();
g.on('pageerror', e => errs.push('pad: ' + e.message));
await g.route(/cdnjs|fonts\.g/, r => r.abort());
await g.goto(URL); await g.evaluate(() => localStorage.removeItem('neonfurnace.v4')); await g.reload(); await g.waitForTimeout(600);
// tap a button for one game frame, then let go
// (plain animation frames here: the usual wait helper skips scenes and unpauses, which would hide what the pad did)
const tap = (i) => g.evaluate(async i => { const fr = n => new Promise(r => { let k = 0; (function f() { if (++k >= n) r(); else requestAnimationFrame(f); })(); });
  __press(i); await fr(3); __press(i, false); await fr(3); }, i);
await g.evaluate(() => __connect());
ok(await g.evaluate(() => !document.getElementById('padHint').hidden && __NF.G.toast && /CONNECTED/.test(__NF.G.toast.text)), 'connecting a controller is announced, on the start screen too');
await g.click('#startBtn'); await g.waitForTimeout(300);
await tap(13);
const menu = await g.evaluate(() => ({ input: __NF.G.input, menu: __NF.G.menu, label: __NF.menuItems()[__NF.G.menu].label }));
ok(menu.input === 'pad' && menu.menu === 1, 'the d-pad moves through the title menu', JSON.stringify(menu));
await g.evaluate(() => { __NF.G.menu = 0; }); await tap(0);
const skillScene = await g.evaluate(() => __NF.G.scene); await tap(1);
const back = await g.evaluate(() => __NF.G.scene);
ok(skillScene === 'skill' && back === 'title', 'A chooses and B goes back', JSON.stringify([skillScene, back]));
await g.evaluate(() => { __NF.G.menu = 0; }); await tap(0); await g.evaluate(() => { __NF.G.menu = 2; }); await tap(0);
const cut = await g.evaluate(() => __NF.G.scene); await tap(0);
ok(cut === 'cut' && await g.evaluate(() => __NF.G.scene === 'play'), 'a new game starts from the controller and A skips the opening scene', cut);
const pmv = await g.evaluate(async () => { const N = __NF, P = N.P; N.G.god = true; for (const e of N.G.ents) { e.hidden = true; e.dead = true; }
  N.CAM.yaw = Math.PI; const z0 = P.z, yaw0 = N.CAM.yaw; __pad.axes[1] = -1; await N.wait(0.7); __pad.axes[1] = 0;
  const walked = z0 - P.z; __pad.axes[2] = 1; await N.wait(0.4); __pad.axes[2] = 0; const turned = yaw0 - N.CAM.yaw;
  __press(0); await N.wait(0.12); const air = !P.onGround; __press(0, false); await N.wait(1.5);
  return { walked, turned, air, landed: P.onGround }; });
ok(pmv.walked > 1.5, 'the left stick runs, relative to the camera', JSON.stringify(pmv));
ok(pmv.turned > 0.3, 'the right stick turns the camera', JSON.stringify(pmv));
ok(pmv.air && pmv.landed, 'A jumps', JSON.stringify(pmv));
const pst = await g.evaluate(async () => { const N = __NF, P = N.P, I = N.WORLD.W.islands.a; P.x = I.x; P.z = I.z + 3; P.y = I.y; P.onGround = true; P.state = 'move'; P.yaw = Math.PI; N.CAM.yaw = Math.PI;
  const e = N.makeEnemy('thug', I.x, I.y, I.z, 'a', true); await N.wait(0.1); __pad.rumbles.length = 0;
  let n = 0; while (!e.dead && n++ < 30) { __press(2); await N.wait(0.06); __press(2, false); await N.wait(0.16); }
  return { dead: e.dead, combo: N.G.maxCombo, rumbles: __pad.rumbles.length }; });
ok(pst.dead && pst.combo >= 2, 'X strikes, chains and knocks an enemy out', JSON.stringify(pst));
ok(pst.rumbles > 0, 'hits make the controller rumble', JSON.stringify(pst));
const prm = await g.evaluate(async () => { const pad = { grapple: btn('grapple'), special: btn('special'), confirm: btn('confirm') };
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
  const kb = { input: __NF.G.input, grapple: btn('grapple') };
  __pad.id = 'DualSense Wireless Controller (Vendor: 054c)'; __press(13); await __NF.wait(0.05); __press(13, false); await __NF.wait(0.05);
  return { pad, kb, ps: { input: __NF.G.input, jump: btn('jump'), grapple: btn('grapple') } }; });
ok(prm.pad.grapple === 'RB' && prm.pad.special === 'LB' && prm.pad.confirm === 'A', 'prompts show the Xbox buttons', JSON.stringify(prm));
ok(prm.kb.input === 'kb' && prm.kb.grapple === 'E', 'touching the keyboard switches the prompts back', JSON.stringify(prm));
ok(prm.ps.input === 'pad' && prm.ps.jump === '✕' && prm.ps.grapple === 'R1', 'a PlayStation controller gets its own symbols', JSON.stringify(prm));
await tap(9);
const pz = await g.evaluate(() => __NF.G.scene); await tap(9);
ok(pz === 'paused' && await g.evaluate(() => __NF.G.scene === 'play'), 'Menu / Options pauses and resumes', pz);
const st = await g.evaluate(async () => { const N = __NF; N.G.scene = 'sound'; N.G.menu = N.menuItems().findIndex(i => i.label === 'INVERT CAMERA');
  const before = N.SV.invertY; __press(0); await N.wait(0.05); __press(0, false); await N.wait(0.05); return { before, after: N.SV.invertY }; });
ok(st.before === false && st.after === true, 'settings can be changed from the controller (invert camera)', JSON.stringify(st));
await pc.close();

console.log('\nPhone');
const ph = await b.newContext({ ...devices['iPhone 13 landscape'] });
const q = await ph.newPage();
q.on('pageerror', e => errs.push('phone: ' + e.message));
await q.route(/cdnjs|fonts\.g/, r => r.abort());
await q.goto(URL);
await q.tap('#startBtn'); await q.waitForTimeout(400);
ok(await q.evaluate(() => __NF.G.touch && document.body.classList.contains('nf-touch')), 'touch is detected');
const box = await q.locator('#game').boundingBox(); const vp = q.viewportSize();
ok(box.height >= vp.height - 2 && Math.abs(box.width / box.height - 16 / 9) < 0.02, 'the game fills the phone screen height at 16:9', JSON.stringify(box));
await q.evaluate(() => { __NF.G.skill = 2; __NF.startCampaign(); __NF.endCut(); __NF.G.god = true; for (const e of __NF.G.ents) { e.state = 'idle'; e.hidden = true; } });
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
