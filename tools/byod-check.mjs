// Bring-your-own-data check: load each template and a malformed file into each drop zone, confirm
// the page accepts the template, rejects the malformed file with a message, and makes no network
// request carrying the data. Usage: node tools/byod-check.mjs page.html '#dzId=template.csv' ...  (server on :8765)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('..', import.meta.url).pathname;
const [page, ...zones] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage(); const reqs = [], errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8765/' + page, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
p.on('request', r => reqs.push(r.method() + ' ' + r.url()));
let bad = 0;
for (const z of zones) {
  const [sel, file] = z.split('=');
  for (const [f, expectOk] of [[root + 'assets/templates/' + file, true], [root + 'tests/fixtures/fund-cashflows-malformed.csv', false]]) {
    await p.evaluate(s => { const t = document.querySelector(s); const tab = t.closest('[role=tabpanel]'); if (tab && tab.hidden) document.querySelector('.tabs button[data-tab="' + tab.id + '"]').click(); }, sel);
    await p.setInputFiles(sel + ' input[type=file]', f); await p.waitForTimeout(700);
    const msg = await p.$eval(sel + ' .dz-msg', e => e.textContent.trim());
    const ok = /Loaded/.test(msg);
    console.log(`${sel} ${f.split('/').pop()}: ${ok ? 'accepted' : 'rejected'} :: ${msg.slice(0, 160)}`);
    if (ok !== expectOk) bad++;
    if (ok) { await p.click(sel + ' .dz-reset'); await p.waitForTimeout(300); }
  }
}
const sent = reqs.filter(r => !/^GET /.test(r) || /\.csv/.test(r));
console.log(sent.length ? 'NETWORK: ' + sent.join(', ') : 'no network requests carried data (' + reqs.length + ' GETs for page assets only)');
if (errs.length) console.log('ERRORS: ' + errs.join(' | '));
await b.close();
process.exit(bad || sent.length || errs.length ? 1 : 0);
