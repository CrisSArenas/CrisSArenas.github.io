// Render the Engineering Lab card previews: each robotics or embedded page at 1440x900, in dark and light,
// downscaled and saved as WebP under assets/previews/lab-<slug>-<theme>.webp.
// Usage: start the site dev server (cd site && npx vite --port 5203 --strictPort --host 127.0.0.1), then
//   node tools/previews-lab.mjs [baseUrl]     (default http://127.0.0.1:5203)
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = new URL('..', import.meta.url).pathname;
const base = (process.argv[2] || 'http://127.0.0.1:5203').replace(/\/$/, '');
const { lab } = JSON.parse(fs.readFileSync(root + 'site/src/data/projects.json', 'utf8'));
const OUT_W = 720, OUT_H = 450, QUALITY = 0.72;
fs.mkdirSync(root + 'assets/previews', { recursive: true });

/* page-specific steps that put a simulator in a representative state before the capture */
const scrollTo = (p, sel, offset = 90) => p.evaluate(([s, o]) => {
  const el = document.querySelector(s);
  if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o);
}, [sel, offset]);
const PREP = {
  /* send a navigation goal so the planned path and the controller are on screen */
  'ros2-nav2': async p => {
    await p.waitForTimeout(800);
    const box = await p.locator('#mainCanvas').boundingBox();
    if (box) await p.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.8);
    await p.waitForTimeout(3500);
  },
  /* drive a short loop so the occupancy grid fills in, then frame the world and map views */
  slam: async p => {
    await p.locator('#worldCanvas').click({ position: { x: 20, y: 20 } }).catch(() => {});
    const drive = async (k, ms) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); };
    await drive('w', 1800); await drive('d', 700); await drive('w', 1600); await drive('a', 500); await drive('w', 1200);
    await scrollTo(p, '#worldCanvas', 140);
    await p.waitForTimeout(600);
  },
  /* run the scheduler so the Gantt chart has history, then frame it */
  freertos: async p => {
    await p.click('#btnPlay').catch(() => {});
    await p.waitForTimeout(3500);
    await scrollTo(p, '#ganttContainer', 340);
    await p.waitForTimeout(400);
  },
  tinyml: async p => { await scrollTo(p, '#heatmapCanvas', 420); await p.waitForTimeout(900); }
};

const browser = await chromium.launch();
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: theme });
  await ctx.addInitScript(t => {
    try { localStorage.setItem('theme', t); localStorage.setItem('nav2HintDismissed', '1'); } catch { /* storage blocked */ }
  }, theme);
  const page = await ctx.newPage();
  for (const item of lab) {
    await page.goto(base + item.href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await (PREP[item.slug] || (p => p.waitForTimeout(1200)))(page);
    const png = await page.screenshot({ type: 'png' });
    /* encode to WebP in the browser, so the script needs nothing beyond Playwright */
    const conv = await ctx.newPage();
    const dataUrl = await conv.evaluate(async ({ b64, w, h, q }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/webp', q);
    }, { b64: png.toString('base64'), w: OUT_W, h: OUT_H, q: QUALITY });
    await conv.close();
    const file = `assets/previews/lab-${item.slug}-${theme}.webp`;
    fs.writeFileSync(root + file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(file, Math.round(fs.statSync(root + file).size / 1024) + ' KB');
  }
  await ctx.close();
}
await browser.close();
