// Stamp the shared nav and footer partials into every page between their markers.
// Usage: node tools/sync-chrome.mjs [--check]   (--check exits 1 if any page differs)
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const parts = ['nav', 'footer'].map(n => {
  const txt = fs.readFileSync(path.join(root, 'tools/partials', n + '.html'), 'utf8').trim();
  const tag = n === 'nav' ? 'site-nav' : 'site-footer';
  return { tag, txt };
});
const check = process.argv.includes('--check');
const skip = new Set(['design-preview.html']);
function pages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    if (['.git', 'node_modules', 'qa', 'tools', 'tests'].includes(d.name)) return [];
    const p = path.join(dir, d.name);
    return d.isDirectory() ? pages(p) : (d.name.endsWith('.html') ? [p] : []);
  });
}
let bad = [], changed = 0;
for (const f of pages(root)) {
  const rel = path.relative(root, f);
  if (skip.has(rel)) continue;
  let html = fs.readFileSync(f, 'utf8'), orig = html;
  for (const { tag, txt } of parts) {
    const re = new RegExp(`<!-- ${tag}:start -->[\\s\\S]*?<!-- ${tag}:end -->`);
    if (!re.test(html)) { bad.push(`${rel}: missing ${tag}`); continue; }
    const cur = html.match(re)[0];
    if (cur !== txt) { if (check) bad.push(`${rel}: ${tag} differs`); else html = html.replace(re, () => txt); }
  }
  if (!check && html !== orig) { fs.writeFileSync(f, html); changed++; }
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log(check ? 'nav and footer identical on every page' : `updated ${changed} page(s)`);
