// Collect each flagship's evaluation panel results (window.EVAL, computed in the page) into
// assets/data/eval-results.js for the AI Systems page. Server on :8765.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('..', import.meta.url).pathname;
const pages = ['private-capital-lab.html', 'allocation-lab.html', 'manager-selection-copilot.html', 'fund-terms-auditor.html', 'multi-strategy-builder.html', 'secondaries-desk.html', 'co-invest-underwriter.html'].filter(p => fs.existsSync(root + p));
const b = await chromium.launch(), out = [];
for (const p of pages) {
  const pg = await b.newPage();
  await pg.goto('http://localhost:8765/' + p, { waitUntil: 'networkidle' });
  await pg.waitForFunction(() => window.EVAL, null, { timeout: 20000 }).catch(() => {});
  const ev = await pg.evaluate(() => window.EVAL || null);
  if (ev) out.push(ev); else console.log('no EVAL on ' + p);
  await pg.close();
}
await b.close();
fs.writeFileSync(root + 'assets/data/eval-results.js', '/* Collected from each demo\'s evaluation panel by tools/collect-eval.mjs. Each demo recomputes these on load. */\nwindow.EVAL_RESULTS = ' + JSON.stringify(out, null, 2) + ';\n');
console.log('collected ' + out.length + ' result(s)');
