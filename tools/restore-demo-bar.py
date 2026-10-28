"""One-off: the old demo-nav carried each page's title and action buttons (reset, guide, sound...).
Rebuild them as a demo bar under the shared site nav."""
import re, subprocess, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
moves = {'terminal-heist.html': 'Robotics and Embedded Systems/terminal-heist.html'}
for p in list(root.glob('*.html')) + list((root / 'robotics').glob('*.html')):
    rel = str(p.relative_to(root))
    old = moves.get(rel) or (rel.replace('robotics/', 'Robotics and Embedded Systems/'))
    try: src = subprocess.run(['git', 'show', 'HEAD:' + old], cwd=root, capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError: continue
    m = re.search(r'<nav class="demo-nav">(.*?)</nav>', src, re.S)
    if not m: continue
    nav = m.group(1)
    title = re.search(r'<h1 class="demo-title"[^>]*>(.*?)</h1>', nav, re.S).group(1).strip()
    acts = re.search(r'<div class="demo-actions">(.*?)</div>\s*$', nav, re.S)
    acts = acts.group(1).strip() if acts else ''
    acts = re.sub(r'<span class="d-pill live"><span class="pulse"></span>\s*LIVE</span>\s*', '', acts)
    acts = re.sub(r'\sstyle="[^"]*"', '', acts)
    if rel.startswith('robotics/'): back = '<a class="back-link" href="/robotics-embedded.html">&larr; Back to Robotics</a>'
    elif rel in ('arcade.html', 'furnace.html', 'terminal-heist.html'): back = '<a class="back-link" href="/#fun">&larr; Back to home</a>'
    else: back = '<a class="back-link" href="/#stack">&larr; Back to the Stack</a>'
    bar = ('<div class="demo-bar"><div class="container">' + back + '<h1 class="demo-title">' + title + '</h1>'
           + ('<div class="demo-actions">' + acts + '</div>' if acts else '') + '</div></div>')
    s = p.read_text()
    if 'class="demo-bar"' in s: continue
    s = s.replace('<!-- site-nav:end -->', '<!-- site-nav:end -->\n' + bar, 1)
    p.write_text(s); print('bar', rel)
