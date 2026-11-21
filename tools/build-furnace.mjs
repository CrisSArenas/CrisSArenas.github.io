// Inline the NEON FURNACE source parts into furnace.html, so the game ships as one file.
// Usage: node tools/build-furnace.mjs
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'tools/neon-furnace');
const PARTS = ['core.js', 'art.js', 'gl.js', 'levels.js', 'world.js', 'audio.js', 'anim.js', 'game.js', 'actors.js', 'bosses.js', 'story.js', 'pad.js', 'hud.js'];
const js = PARTS.map(f => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(src, f), 'utf8').trim()).join('\n\n');
const page = path.join(root, 'furnace.html');
const html = fs.readFileSync(page, 'utf8');
const re = /(<script id="nf-game">)[\s\S]*?(<\/script>)/;
if (!re.test(html)) throw new Error('furnace.html has no <script id="nf-game"> block');
const out = html.replace(re, (_, a, b) => `${a}\n${js.replace(/<\/script/gi, '<\\/script')}\n${b}`);
fs.writeFileSync(page, out);
console.log(`furnace.html: ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB (${PARTS.length} parts inlined)`);
