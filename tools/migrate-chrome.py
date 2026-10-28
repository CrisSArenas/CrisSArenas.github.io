"""One-off migration: give every surviving page the shared head assets, nav and footer markers.
Run once in Phase 2; tools/sync-chrome.mjs then stamps the partials in."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap" rel="stylesheet">'
HEADX = ('<link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">\n'
         '<link rel="stylesheet" href="/styles.css">\n')
NAV = '<!-- site-nav:start -->\n<!-- site-nav:end -->'
FOOT = '<!-- site-footer:start -->\n<!-- site-footer:end -->'
def fix(p):
    s = p.read_text()
    o = s
    # fonts, favicon, stylesheets, site.js
    s = re.sub(r'<link href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet">', FONTS, s)
    s = re.sub(r'\s*<link rel="icon" href="data:[^>]*>', '', s)
    s = re.sub(r'<link rel="stylesheet" href="(\.\./)?styles\.css(\?v=2)?">', '<link rel="stylesheet" href="/styles.css">', s)
    s = re.sub(r'<link rel="stylesheet" href="(\.\./)?assets/css/demo-shell\.css(\?v=2)?">', '<link rel="stylesheet" href="/assets/css/demo-shell.css">', s)
    if '/styles.css' not in s:
        s = s.replace('<link rel="stylesheet" href="/assets/css/demo-shell.css">', HEADX + '<link rel="stylesheet" href="/assets/css/demo-shell.css">', 1)
    elif 'favicon.svg' not in s:
        s = s.replace('<link rel="stylesheet" href="/styles.css">', '<link rel="icon" href="/assets/images/favicon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="/styles.css">', 1)
    if '/assets/js/site.js' not in s:
        s = s.replace('</head>', '<script src="/assets/js/site.js"></script>\n</head>', 1)
    s = re.sub(r'\s*<script src="(\.\./)?script\.js"></script>', '', s)
    # nav
    if 'site-nav:start' not in s:
        s, n = re.subn(r'<nav class="(navbar|demo-nav)".*?</nav>', NAV, s, count=1, flags=re.S)
        if not n:
            s, n = re.subn(r'<nav class="nav">.*?</nav>', NAV, s, count=1, flags=re.S)
        if not n: print('NO NAV', p)
    # footer
    if 'site-footer:start' not in s:
        s, n = re.subn(r'<footer class="footer">.*?</footer>\s*(<!--[^>]*-->\s*)?(<button[^>]*scroll-?[Tt]op.*?</button>)?', FOOT, s, count=1, flags=re.S)
        if not n:
            s, n = re.subn(r'<footer class="mini">.*?</footer>', FOOT, s, count=1, flags=re.S)
        if not n and 'class="demo-footer"' in s:
            s = re.sub(r'\s*<div class="bottom">.*?</div>\s*(?=</div>\s*</footer>)', '\n', s, count=1, flags=re.S)
            s, n = re.subn(r'(<footer class="demo-footer">.*?</footer>)', r'\1\n' + FOOT, s, count=1, flags=re.S)
        if not n:
            s, n = re.subn(r'<footer>.*?</footer>', FOOT, s, count=1, flags=re.S)
        if not n:
            s = s.replace('</body>', FOOT + '\n</body>', 1); print('appended footer', p)
    # links to the old structure
    s = s.replace("Robotics and Embedded Systems/", "robotics/")
    s = re.sub(r'href="(\.\./)?index\.html#(projects|demos|skills|about|home)"', 'href="/#stack"', s)
    s = re.sub(r'href="(\.\./)?index\.html#research"', 'href="/#research"', s)
    s = re.sub(r'href="(\.\./)?index\.html#arcade"', 'href="/#fun"', s)
    s = re.sub(r'href="(\.\./)?index\.html"', 'href="/"', s)
    s = re.sub(r'href="\.\./robotics-embedded\.html"', 'href="/robotics-embedded.html"', s)
    s = re.sub(r'href="\.\./assets/', 'href="/assets/', s)
    if s != o:
        p.write_text(s); print('updated', p.relative_to(root))
pages = [p for p in root.glob('*.html') if p.name not in ('index.html', 'design-preview.html')] + list((root / 'robotics').glob('*.html'))
for p in pages: fix(p)
