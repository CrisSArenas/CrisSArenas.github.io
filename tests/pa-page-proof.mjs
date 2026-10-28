// Proof that the Multi-Strategy Builder's portable alpha tab reproduces the original Portable Alpha
// Simulator page (commit bbdb266) at its default inputs and two other seeds: every performance figure,
// health value and stress result is compared as displayed. Run with the site served on :8765.
// Usage: node tests/pa-page-proof.mjs
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('..', import.meta.url).pathname;
fs.mkdirSync(root + 'qa', { recursive: true });
fs.writeFileSync(root + 'qa/pa-old.html', execSync('git show bbdb266:portable-alpha-simulator.html', { cwd: root }));
const b = await chromium.launch();
const cells = sel => [...document.querySelectorAll(sel)].map(r => [...r.children].map(c => c.textContent.trim()));
let total = 0, same = 0; const diffs = [];
for (const seed of [42, 7, 2024]) {
  const o = await b.newPage(); await o.goto('http://localhost:8765/qa/pa-old.html', { waitUntil: 'load' });
  await o.evaluate(s => { const el = document.getElementById('seed'); el.value = s; runAll(); }, seed);
  const old = await o.evaluate(() => ({
    kpi: [...document.querySelectorAll('#kpiBody tr')].map(r => [...r.children].slice(0, 3).map(c => c.textContent.trim())),
    stress: [...document.querySelectorAll('#stressBody tr')].map(r => [...r.children].slice(1, 4).map(c => c.textContent.trim())),
    health: [...document.querySelectorAll('#healthBox .health-row')].map(r => [r.querySelector('.health-val').textContent.trim(), r.querySelector('.health-dot').classList.contains('ok')])
  }));
  const n = await b.newPage(); await n.goto('http://localhost:8765/multi-strategy-builder.html', { waitUntil: 'load' });
  await n.evaluate(s => { const el = document.getElementById('pa-seed'); el.value = s; el.dispatchEvent(new Event('input', { bubbles: true })); }, seed);
  await n.waitForTimeout(600);
  const neu = await n.evaluate(() => ({
    kpi: [...document.querySelectorAll('#paKpis tbody tr')].map(r => [...r.children].slice(0, 3).map(c => c.textContent.trim())),
    stress: [...document.querySelectorAll('#paStress tbody tr')].map(r => [...r.children].slice(1, 4).map(c => c.textContent.trim())),
    health: [...document.querySelectorAll('#paHealth .health-row')].map(r => [r.querySelector('.health-val').textContent.trim(), !r.querySelector('.health-dot').classList.contains('warn')])
  }));
  for (const k of ['kpi', 'stress', 'health']) old[k].forEach((row, i) => row.forEach((v, j) => { total++; const w = neu[k][i] && neu[k][i][j]; if (String(w) === String(v)) same++; else diffs.push(`seed ${seed} ${k}[${i}][${j}]: old ${v} new ${w}`); }));
  await o.close(); await n.close();
}
await b.close();
const out = `Portable alpha tab vs original page (bbdb266), seeds 42, 7, 2024: ${same} of ${total} displayed values identical\n` + diffs.join('\n');
console.log(out);
{ const f = root + 'tests/legacy-proof-output.txt', prev = fs.readFileSync(f, 'utf8'), i = prev.indexOf('\nPortable alpha tab vs original page'); fs.writeFileSync(f, (i >= 0 ? prev.slice(0, i) : prev) + '\n' + out + '\n'); }
process.exit(diffs.length ? 1 : 0);
