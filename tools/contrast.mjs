// WCAG AA contrast check for the light and dark palette tokens in styles.css.
// Text pairs need 4.5:1; chart series and UI marks need 3:1. Matte gold is decorative in light mode only.
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const grab = re => { const b = css.match(re)[0], t = {}; for (const d of b.matchAll(/--c-([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) t[d[1]] = d[2]; return t; };
const pals = { light: grab(/:root \{\n  --c-page[\s\S]*?\n\}/), dark: grab(/:root\[data-theme="dark"\] \{[\s\S]*?\n  \}/) };
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const grounds = ['page', 'tint', 'card', 'panel'];
const textFg = ['text', 'text-2', 'text-3', 'gold-text', 'green', 'positive', 'negative'];
let fails = 0; const rows = [];
const chk = (mode, fg, bg, min, t) => { const r = ratio(t[fg], t[bg]); const ok = r >= min; if (!ok) fails++; rows.push(`${mode.padEnd(5)} ${(fg + ' on ' + bg).padEnd(24)} ${t[fg]} / ${t[bg]}  ${r.toFixed(2).padStart(5)}  ${min}:1  ${ok ? 'pass' : 'FAIL'}`); };
for (const [mode, t] of Object.entries(pals)) {
  for (const f of textFg) for (const g of grounds) chk(mode, f, g, 4.5, t);
  chk(mode, 'btn-text', 'btn', 4.5, t);
  chk(mode, 'page', 'gold-text', 4.5, t);           // selected segment and step dots: page-colored text on gold
  for (const s of ['green', 'graphite', 'graphite-2', ...(mode === 'dark' ? ['gold'] : [])]) for (const g of ['page', 'card']) chk(mode, s, g, 3, t);
}
console.log(rows.join('\n'));
console.log(fails ? `\n${fails} pair(s) fail` : '\nall pairs pass');
process.exit(fails ? 1 : 0);
