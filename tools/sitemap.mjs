// Write sitemap.xml: the new pages (home, work and each case study, research, lab, about, contact; listed from
// site/src/data/projects.json, so they are included before or after a publish) and the legacy pages that stay
// (applications, memos, notes, robotics, the AI deep dive, tests). Redirect stubs and 404.html are left out.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ORIGIN = 'https://crissarenas.github.io/';
const data = JSON.parse(fs.readFileSync(path.join(root, 'site/src/data/projects.json'), 'utf8'));

const fresh = [
  ['', '1.0'], ['work/', '0.9'], ...data.projects.map(p => [`work/${p.slug}/`, '0.8']),
  ['research/', '0.9'], ['lab/', '0.8'], ['about/', '0.8'], ['contact/', '0.6']
];

const skip = new Set(['design-preview.html', '404.html']);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  if (['.git', 'tools', 'tests', 'qa', 'node_modules', 'assets', 'site'].includes(e.name)) return [];
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : e.name.endsWith('.html') && !skip.has(path.relative(root, p)) ? [path.relative(root, p)] : [];
});
const legacy = walk(root).filter(f => {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  return !/<div id="root"/.test(html) && !/http-equiv="refresh"/i.test(html);  /* React pages are listed above; redirects are not pages */
}).sort();
const pri = f => /^(allocation-lab|private-capital-lab|manager-selection-copilot|fund-terms-auditor|co-invest-underwriter|secondaries-desk|multi-strategy-builder|agentic-portfolio-monitor|portfolio-risk-performance|allocation-rebalancing|systematic-research-lab|ai-engineering-lab)\.html$/.test(f) ? '0.7'
  : f.startsWith('notes/') || f.startsWith('memos/') || /^(ai-systems|research-regime)/.test(f) ? '0.6' : '0.5';

const rows = [...fresh, ...legacy.map(f => [f.replace(/(^|\/)index\.html$/, '$1'), pri(f)])];
const seen = new Set();
const urls = rows.filter(([loc]) => !seen.has(loc) && seen.add(loc))
  .map(([loc, p]) => `  <url><loc>${ORIGIN}${loc}</loc><changefreq>monthly</changefreq><priority>${p}</priority></url>`);
fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`sitemap: ${urls.length} urls (${fresh.length} new pages, ${urls.length - fresh.length} legacy)`);
