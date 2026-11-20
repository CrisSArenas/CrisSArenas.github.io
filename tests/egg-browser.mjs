// The homepage photo easter egg: three clicks open the way to the game, slow clicks do not, and the
// footer cursor appears afterwards on new and older pages.
// Usage: serve the repo root on :8765 (python3 -m http.server 8765), then node tests/egg-browser.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const SHOTS = process.env.SHOTS;
let failed = 0;
const ok = (c, name, d = '') => { console.log(`  ${c ? 'pass' : 'FAIL'}  ${name}${c ? '' : '\n        ' + d}`); if (!c) failed++; };
const b = await chromium.launch();
const errs = [];
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/'); await p.evaluate(() => localStorage.removeItem('nf-found')); await p.reload();
await p.waitForTimeout(1200);
const img = p.locator('.nf-photo');
const stage = () => p.locator('.nf-egg').getAttribute('data-stage');
const name0 = await p.locator('#hero-name').boundingBox();
ok(await p.locator('.site-footer .nf-cursor, footer .nf-cursor').count() === 0, 'no footer cursor before the game is found');
ok((await img.evaluate(el => el.tagName === 'IMG' && !el.closest('button,a') && !el.hasAttribute('tabindex'))), 'the photo is a plain image, not a button');
// slow clicks never get past the first glitch
await img.click(); await p.waitForTimeout(4300); await img.click(); await p.waitForTimeout(4300); await img.click(); await p.waitForTimeout(800);
ok(await p.locator('.nf-gate').count() === 0, 'three slow clicks do not open it');
await p.waitForTimeout(4300);   // let the count lapse before the real attempt
await img.hover(); await p.waitForTimeout(400);
if (SHOTS) await p.screenshot({ path: SHOTS + '/egg-0hover.png', clip: { x: 260, y: 40, width: 420, height: 220 } });
await img.click(); await p.waitForTimeout(90);
ok(await stage() === '1', 'first click glitches the photo', await stage());
if (SHOTS) await p.screenshot({ path: SHOTS + '/egg-1.png', clip: { x: 260, y: 40, width: 420, height: 220 } });
await p.waitForTimeout(600);
await img.click({ force: true }); await p.waitForTimeout(500);
ok(await stage() === '2', 'second click peels it back');
if (SHOTS) await p.screenshot({ path: SHOTS + '/egg-2.png', clip: { x: 260, y: 40, width: 420, height: 220 } });
await img.click({ force: true }); await p.waitForTimeout(900);
ok(await p.locator('.nf-gate[role="dialog"]').count() === 1, 'third click opens the way in');
if (SHOTS) await p.screenshot({ path: SHOTS + '/egg-3.png' });
ok(await p.evaluate(() => document.activeElement && document.activeElement.textContent === 'Enter'), 'Enter has focus');
ok(await p.locator('.nf-gate-enter').getAttribute('href') === '/furnace.html', 'Enter goes to the game');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok(await p.locator('.nf-gate').count() === 0 && await stage() === '0', 'Esc closes it and puts the photo back');
const name1 = await p.locator('#hero-name').boundingBox();
ok(Math.abs(name1.y - name0.y) < 1, 'the hero did not move', JSON.stringify([name0.y, name1.y]));
await p.reload(); await p.waitForTimeout(1000);
ok(await p.locator('footer .nf-cursor').count() === 1, 'after finding it, the footer cursor appears on the homepage');
ok(await p.locator('.nf-egg[data-found]').count() === 1, 'and the photo glows a little stronger');
await p.goto(BASE + '/ai-systems.html'); await p.waitForTimeout(500);
ok(await p.locator('.site-footer .nf-cursor').count() === 1, 'and on the older pages too');
// "Not now" path on a phone, by tapping
const ph = await b.newContext({ ...devices['iPhone 13'] });
const q = await ph.newPage();
q.on('pageerror', e => errs.push('phone: ' + e.message));
await q.goto(BASE + '/'); await q.waitForTimeout(1200);
for (let i = 0; i < 3; i++) { await q.locator('.nf-photo').tap({ force: true }); await q.waitForTimeout(350); }
await q.waitForTimeout(700);
ok(await q.locator('.nf-gate').count() === 1, 'three taps open it on a phone');
if (SHOTS) await q.screenshot({ path: SHOTS + '/egg-phone.png' });
await q.locator('.nf-gate-later').tap(); await q.waitForTimeout(300);
ok(await q.locator('.nf-gate').count() === 0, '"Not now" closes it');
const sw = await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
ok(sw, 'no sideways scroll on the phone');
await ph.close();
ok(errs.length === 0, 'no script errors', errs.join('\n'));
await b.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
