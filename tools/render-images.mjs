// Render the OG share image (1200x630) and the PNG favicon fallback with Playwright.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('..', import.meta.url).pathname;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto('file://' + root + 'tools/og-template.html');
await p.waitForTimeout(500);
await p.screenshot({ path: root + 'assets/images/og.png' });
const f = await b.newPage({ viewport: { width: 64, height: 64 } });
await f.goto('file://' + root + 'assets/images/favicon.svg');
await f.screenshot({ path: root + 'assets/images/favicon.png', omitBackground: true });
await b.close();
console.log('rendered og.png and favicon.png');
