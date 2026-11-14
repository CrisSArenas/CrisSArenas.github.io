// Generate one static HTML entry per page into site/ (index.html, work/, research/, lab/, about/, contact/; gitignored). Each page carries its own title,
// description and social tags, a readable fallback for crawlers and visitors without JavaScript, and the
// script that mounts the React page. Case studies are generated from src/data/projects.json.
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const site = path.resolve(here, '..');
const www = site; /* pages are generated in place: site/index.html, site/work/..., all gitignored */
const GEN_DIRS = ['work', 'research', 'lab', 'about', 'contact'];
const data = JSON.parse(fs.readFileSync(path.join(site, 'src/data/projects.json'), 'utf8'));
const ORIGIN = 'https://crissarenas.github.io';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pages = [
  { url: '/', script: 'home', title: 'Cristian Arenas · Quantitative Investment Management & AI Engineering',
    desc: 'Cristian Arenas: quantitative investment management and AI engineering. Portfolio management across public and private markets, quantitative research, and agentic AI systems, with working applications.' },
  { url: '/work/', script: 'work', title: 'Work · Cristian Arenas',
    desc: 'Working applications in portfolio management, quantitative research, AI engineering and private markets, each with a case study.' },
  { url: '/research/', script: 'research', title: 'Research · Cristian Arenas',
    desc: 'Published research on regime-aware deep learning for multi-asset allocation, investment memos and practitioner notes.' },
  { url: '/lab/', script: 'lab', title: 'Engineering Lab · Cristian Arenas',
    desc: 'AI systems engineering, robotics, autonomous systems, embedded computing and edge ML, as interactive simulators and technical write-ups.' },
  { url: '/about/', script: 'about', title: 'About · Cristian Arenas',
    desc: 'Background in institutional investment management, quantitative research and AI systems engineering.' },
  { url: '/contact/', script: 'contact', title: 'Contact · Cristian Arenas',
    desc: 'Get in touch with Cristian Arenas by email or LinkedIn.' },
  ...data.projects.map(p => ({ url: `/work/${p.slug}/`, script: 'case', slug: p.slug, title: `${p.title} · Case study · Cristian Arenas`, desc: p.summary, h1: p.title, live: p.href }))
];

function html(p) {
  const rel = '/src/pages/' + p.script + '.tsx';
  const links = [['/', 'Home'], ['/work/', 'Work'], ['/research/', 'Research'], ['/lab/', 'Lab'], ['/about/', 'About'], ['/contact/', 'Contact']];
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${ORIGIN}${p.url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${ORIGIN}${p.url}">
<meta property="og:image" content="${ORIGIN}/assets/images/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A0D10">
<link rel="icon" href="/assets/images/favicon.svg?v=7" type="image/svg+xml">
<link rel="icon" href="/assets/images/favicon.png?v=7" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png?v=7">
<link rel="preload" href="/assets/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/tokens.css">
<script>(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){}})();</script>
</head>
<body>
<div id="root"${p.slug ? ` data-slug="${esc(p.slug)}"` : ''}>
  <noscript-fallback>
    <nav aria-label="Site">${links.map(([h, l]) => `<a href="${h}">${l}</a>`).join(' · ')}</nav>
    <main><h1>${esc(p.h1 || p.title.split(' · ')[0])}</h1><p>${esc(p.desc)}</p>${p.live ? `<p><a href="${p.live}">Open the application</a></p>` : ''}</main>
  </noscript-fallback>
</div>
<script type="module" src="${rel}"></script>
</body>
</html>
`;
}

for (const d of GEN_DIRS) fs.rmSync(path.join(site, d), { recursive: true, force: true });
fs.rmSync(path.join(site, 'index.html'), { force: true });
for (const p of pages) {
  const dir = path.join(www, p.url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html(p));
}
fs.writeFileSync(path.join(site, 'src/data/pages.json'), JSON.stringify(pages.map(p => ({ url: p.url, title: p.title })), null, 1) + '\n');
console.log(`generated ${pages.length} pages`);
