// Point interim links at their final pages once those pages exist.
// An element written as <a href="interim" data-final="final.html#x"> switches to href="final.html#x"
// when final.html exists; "In build" markers inside the activated anchor become "Open the demo".
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html', 'ai-systems.html', 'data-model.html', 'notes/index.html'];
let n = 0;
for (const rel of files) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) continue;
  let html = fs.readFileSync(f, 'utf8');
  const re = /<a\b([^>]*?)\sdata-final="([^"]+)"([^>]*)>/g;
  let out = '', last = 0, m;
  while ((m = re.exec(html))) {
    const target = m[2], file = target.split('#')[0];
    const dir = path.dirname(f);
    const exists = fs.existsSync(file.startsWith('/') ? path.join(root, file) : path.join(dir, file));
    if (!exists) continue;
    let tag = ('<a' + m[1] + m[3] + '>').replace(/\shref="[^"]*"/, ` href="${target}"`).replace(/\sis-building/, '');
    const close = html.indexOf('</a>', re.lastIndex);
    let inner = html.slice(re.lastIndex, close)
      .replace('<span class="sc-go"><span class="in-build">In build</span></span>', '<span class="sc-go">Open the demo</span>');
    out += html.slice(last, m.index) + tag + inner;
    last = close; n++;
  }
  out += html.slice(last);
  fs.writeFileSync(f, out);
}
console.log(`activated ${n} link(s)`);
