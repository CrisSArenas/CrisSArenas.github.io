// WCAG AA contrast check for the light and dark token blocks in styles.css.
// Body text pairs need 4.5:1, large text / UI / chart series need 3:1.
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const pals = {};
const blocks = { light: css.match(/:root \{\n  --bg:[\s\S]*?\n\}/)[0], dark: css.match(/:root\[data-theme="dark"\] \{[\s\S]*?\n\}/)[0] };
for (const [name, b] of Object.entries(blocks)) { const t = {}; for (const d of b.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) t[d[1]] = d[2]; pals[name] = t; }
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const text = [['text', 'bg'], ['text', 'surface'], ['text', 'surface-2'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'], ['primary', 'bg'], ['primary', 'surface'],
  ['accent-text', 'bg'], ['accent-text', 'surface'], ['accent-text', 'surface-2'], ['link', 'bg'], ['link', 'surface'], ['ai', 'bg'], ['ai', 'surface'], ['pm', 'surface'], ['pf', 'surface'],
  ['positive', 'surface'], ['positive', 'bg'], ['negative', 'surface'], ['negative', 'bg'], ['warning', 'surface'], ['on-primary', 'primary'],
  ['heading', 'bg'], ['heading', 'bg-alt'], ['heading', 'surface'], ['bottle', 'bg'], ['bottle', 'bg-alt'], ['navy', 'bg'], ['navy', 'bg-alt'], ['text', 'bg-alt'], ['muted', 'bg-alt'], ['link', 'bg-alt'], ['on-accent', 'accent']];
const fills = [];
const ui = [['accent', 'bg'], ['accent', 'surface'], ['field-border', 'surface'], ['focus', 'bg'], ...['s1', 's2', 's3', 's4', 's5', 's6'].flatMap(s => [[s, 'bg'], [s, 'surface']])];
let fails = 0; const rows = [];
for (const [name, t] of Object.entries(pals)) {
  const dark = lum(t.bg) < 0.2;
  const chk = (fg, bg, min, fgHex, bgHex) => { const r = ratio(fgHex, bgHex); const ok = r >= min; if (!ok) fails++; rows.push(`${name}  ${(fg + ' on ' + bg).padEnd(26)} ${fgHex} / ${bgHex}  ${r.toFixed(2).padStart(5)}  ${min}:1  ${ok ? 'pass' : 'FAIL'}`); };
  for (const [f, b] of text) if (t[f] && t[b]) chk(f, b, 4.5, t[f], t[b]);
  for (const [f] of fills) { const tx = dark ? t.bg : t.surface; chk(dark ? 'bg' : 'surface', f + ' (tag)', 4.5, tx, t[f]); }
  for (const [f, b] of ui) if (t[f] && t[b]) chk(f, b, 3, t[f], t[b]);
}
console.log(rows.join('\n'));
console.log(fails ? `\n${fails} pair(s) fail` : '\nall pairs pass');
process.exit(fails ? 1 : 0);
