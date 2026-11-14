// Copy the production build (site/dist) into the repository root, where GitHub Pages serves it.
// Only files the build produced are written; files published last time that the build no longer
// produces are removed, using the manifest in site/published.json. Nothing else in the repo is touched.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const site = path.resolve(here, '..');
const repo = path.resolve(site, '..');
const dist = path.join(site, 'dist');
const manifestPath = path.join(site, 'published.json');

function walk(dir, out = []) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, out); else out.push(path.relative(dist, p));
  }
  return out;
}
const files = walk(dist).sort();
const allowed = f => f === 'index.html' || /^(work|research|lab|about|contact)\//.test(f) || f.startsWith('assets/site/');
const bad = files.filter(f => !allowed(f));
if (bad.length) { console.error('refusing to publish unexpected paths:\n' + bad.join('\n')); process.exit(1); }

const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
const stale = previous.filter(f => !files.includes(f) && allowed(f));
for (const f of stale) { const p = path.join(repo, f); if (fs.existsSync(p)) fs.unlinkSync(p); }
for (const f of files) {
  const to = path.join(repo, f);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(dist, f), to);
}
fs.writeFileSync(manifestPath, JSON.stringify(files, null, 1) + '\n');
console.log(`published ${files.length} files, removed ${stale.length} stale`);
