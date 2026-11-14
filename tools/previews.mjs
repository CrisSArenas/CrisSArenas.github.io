// Real screenshots of the twelve working applications for the /work/ cards and case studies.
// Usage: node tools/previews.mjs [port]   (a server on that port must serve the repository root, e.g. the
// site's Vite dev server: cd site && npx vite --port 5202 --strictPort --host 127.0.0.1)
// For each application in site/src/data/projects.json it loads the page at 1440 x 900 with reduced motion,
// waits until window.cardStat() returns its base-case number, hides the site nav, crops the informative upper
// middle of the page and writes assets/previews/<slug>-dark.webp and <slug>-light.webp (1200 px wide, WebP via
// Python PIL). Optional: `--only slug1,slug2` to redo a few.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const port = Number(args.find(a => /^\d+$/.test(a)) || 5202);
const onlyArg = args.indexOf('--only');
const only = onlyArg >= 0 ? new Set(args[onlyArg + 1].split(',')) : null;
const outDir = path.join(root, 'assets/previews');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'previews-'));
const { projects } = JSON.parse(fs.readFileSync(path.join(root, 'site/src/data/projects.json'), 'utf8'));

/* Where the crop starts, measured from the top of the page with the nav hidden. Most pages read best from
   the hero; a few have a long introduction, so the crop starts lower to show their working surface. */
const OFFSET = { 'ai-engineering-lab': 590 };
/* the applications sit in a centred column about 1100 px wide, so the crop keeps the middle 1200 px of the
   1440 px viewport at full resolution and drops the empty margins */
const W = 1440, H = 900, CROP_X = 120, CROP_W = 1200, CROP_H = 750, OUT_W = 1200, QUALITY = 80;

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const p of projects) {
  if (only && !only.has(p.slug)) continue;
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.addInitScript(t => { try { localStorage.setItem('theme', t); } catch (e) { /* storage blocked */ } }, theme);
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}${p.href}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.cardStat && window.cardStat(), null, { timeout: 30000 });
    await page.addStyleTag({ content: '.site-nav, .skip-link, a[href="#main"] { display: none !important; } html { scroll-behavior: auto !important; } *, *::before, *::after { animation: none !important; transition: none !important; } .reveal, [data-reveal] { opacity: 1 !important; transform: none !important; }' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(400);
    const y = OFFSET[p.slug] || 0;
    const png = path.join(tmp, `${p.slug}-${theme}.png`);
    await page.screenshot({ path: png, clip: { x: CROP_X, y, width: CROP_W, height: CROP_H }, fullPage: true });
    await ctx.close();
    const webp = path.join(outDir, `${p.slug}-${theme}.webp`);
    execFileSync('python3', ['-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w = int(sys.argv[3]); h = round(im.height * w / im.width)
im = im.resize((w, h), Image.LANCZOS)
q = int(sys.argv[4])
im.save(sys.argv[2], 'WEBP', quality=q, method=6)
`, png, webp, String(OUT_W), String(QUALITY)]);
    console.log(`${path.relative(root, webp)}  ${(fs.statSync(webp).size / 1024).toFixed(0)} KB`);
  }
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
