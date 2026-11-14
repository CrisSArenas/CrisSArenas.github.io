// Render the OG share image (1200x630) from tools/og-template.html and the favicon fallbacks from
// assets/images/favicon.svg: favicon.png (64), apple-touch-icon.png (180) and favicon.ico (16, 32, 48) with Playwright.
// Usage: node tools/render-images.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }
const root = new URL('..', import.meta.url).pathname;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto('file://' + root + 'tools/og-template.html');
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.screenshot({ path: root + 'assets/images/og.png' });

const svg = fs.readFileSync(root + 'assets/images/favicon.svg', 'utf8');
const icon = async n => {
  const f = await b.newPage({ viewport: { width: n, height: n } });
  await f.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${n}" height="${n}" `)}</body></html>`);
  const buf = await f.screenshot({ omitBackground: true });
  await f.close();
  return buf;
};
fs.writeFileSync(root + 'assets/images/favicon.png', await icon(64));
fs.writeFileSync(root + 'assets/images/apple-touch-icon.png', await icon(180));
/* favicon.ico: an ICO directory with PNG payloads */
const sizes = [16, 32, 48], pngs = [];
for (const n of sizes) pngs.push(await icon(n));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let off = head.length;
sizes.forEach((n, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(n, e); head.writeUInt8(n, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6); head.writeUInt32LE(pngs[i].length, e + 8); head.writeUInt32LE(off, e + 12);
  off += pngs[i].length;
});
fs.writeFileSync(root + 'favicon.ico', Buffer.concat([head, ...pngs]));
await b.close();
console.log('rendered og.png, favicon.png, apple-touch-icon.png and favicon.ico');
