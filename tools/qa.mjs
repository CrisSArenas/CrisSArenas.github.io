// Browser QA: console errors, horizontal scroll at 390px, optional screenshots.
// Usage: node tools/qa.mjs [--shots] [--themes] page1.html page2.html ...  (server on :8765)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const shots = args.includes('--shots'), themes = args.includes('--themes');
const pages = args.filter(a => !a.startsWith('--'));
const base = 'http://localhost:8765/';
const browser = await chromium.launch();
let problems = 0;
for (const p of pages) {
  for (const width of [1440, 390]) {
    for (const scheme of themes || shots ? ['light', 'dark'] : ['light']) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
      const page = await ctx.newPage();
      const errs = [];
      page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_PROXY/.test(m.text())) errs.push(m.text()); });
      page.on('pageerror', e => errs.push(String(e)));
      page.on('requestfailed', r => { const u = r.url(); if (u.startsWith(base)) errs.push('failed: ' + u); });
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
      await page.goto(base + p, { waitUntil: 'networkidle' }).catch(e => errs.push('goto ' + e.message));
      await page.waitForTimeout(600);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const tag = `${p} @${width} ${scheme}`;
      if (errs.length) { problems++; console.log('ERR ' + tag + '\n  ' + errs.slice(0, 8).join('\n  ')); }
      if (sw > 0) { problems++; console.log(`SCROLL ${tag}: ${sw}px`); }
      if (shots) await page.screenshot({ path: `qa/${p.replace(/\//g, '_').replace('.html', '')}-${width}-${scheme}.png`, fullPage: true });
      await ctx.close();
    }
  }
}
await browser.close();
console.log(problems ? `${problems} problem(s)` : `clean: ${pages.length} page(s)`);
process.exit(problems ? 1 : 0);
