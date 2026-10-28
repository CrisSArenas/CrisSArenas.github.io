// Write sitemap.xml from the public pages that exist.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const skip = new Set(['design-preview.html', '404.html']);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  if (['.git', 'tools', 'tests', 'qa', 'node_modules', 'assets'].includes(e.name)) return [];
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : e.name.endsWith('.html') && !skip.has(path.relative(root, p)) ? [path.relative(root, p)] : [];
});
const pri = f => f === 'index.html' ? '1.0' : /^(allocation-lab|private-capital-lab|manager-selection-copilot|fund-terms-auditor|co-invest-underwriter|secondaries-desk|multi-strategy-builder|agentic-portfolio-monitor)\.html$/.test(f) ? '0.9' : f.startsWith('notes/') || /^(ai-systems|data-model|research)/.test(f) ? '0.8' : '0.5';
const urls = walk(root).sort().map(f => {
  const loc = 'https://crissarenas.github.io/' + f.replace(/(^|\/)index\.html$/, '$1');
  return `  <url><loc>${loc}</loc><changefreq>monthly</changefreq><priority>${pri(f)}</priority></url>`;
});
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`sitemap: ${urls.length} urls`);
