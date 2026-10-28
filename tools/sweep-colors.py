"""Sweep hardcoded neon colors to design tokens.
usage: python3 tools/sweep-colors.py [--all] file...   (default: CSS only, i.e. <style> blocks and style="" attributes;
       --all also rewrites quoted colors in scripts, only for pages with no canvas drawing)"""
import re, sys
HEX = {
 '00f7ff': 'var(--accent-text)', '22d3ee': 'var(--ai)', '67e8f9': 'var(--ai)',
 '00ff41': 'var(--positive)', '10b981': 'var(--positive)', '86efac': 'var(--positive)', '4ade80': 'var(--positive)', '34d399': 'var(--positive)',
 '06b6d4': 'var(--ai)', '0891b2': 'var(--s1)', '3b82f6': 'var(--s1)', '60a5fa': 'var(--s1)',
 'ef4444': 'var(--negative)', 'f87171': 'var(--negative)', 'dc2626': 'var(--negative)',
 'f59e0b': 'var(--warning)', 'fbbf24': 'var(--warning)', 'fcd34d': 'var(--warning)', 'd97706': 'var(--s2)', 'f97316': 'var(--s2)',
 '8b5cf6': 'var(--s5)', 'c084fc': 'var(--s5)', '7c3aed': 'var(--s4)', 'a78bfa': 'var(--s5)', 'f472b6': 'var(--s5)', 'ec4899': 'var(--s5)',
 '64748b': 'var(--muted)', '94a3b8': 'var(--muted)', 'a1a1aa': 'var(--muted)', '83838d': 'var(--muted)', '7788a0': 'var(--muted)', '71717a': 'var(--muted)',
 'cbd5e1': 'var(--text)', 'e2e8f0': 'var(--text)', 'e4e4e7': 'var(--text)', 'f1f5f9': 'var(--text)', 'ffffff': 'var(--text)', 'fff': 'var(--text)',
 '0a0e27': 'var(--bg)', '05080f': 'var(--bg)', '080d1a': 'var(--bg)', '0b1020': 'var(--bg)',
 '0f1629': 'var(--surface)', '111827': 'var(--surface)', '1a2332': 'var(--surface-2)', '0f172a': 'var(--surface-2)',
 '1e293b': 'var(--border)', '334155': 'var(--border-strong)', '475569': 'var(--border-strong)', '04121a': 'var(--on-primary)',
}
RGB = {
 (0, 247, 255): '--accent', (0, 255, 65): '--positive', (16, 185, 129): '--positive', (6, 182, 212): '--ai', (59, 130, 246): '--ai',
 (139, 92, 246): '--ai', (239, 68, 68): '--negative', (245, 158, 11): '--warning', (255, 255, 255): '--text', (34, 211, 238): '--ai',
 (10, 14, 39): '--bg', (5, 8, 15): '--bg', (15, 22, 41): '--surface', (3, 6, 18): '--bg',
}
def conv(txt, quoted_only=False):
    def hexrep(m):
        h = m.group(1).lower()
        return HEX.get(h, m.group(0))
    txt = re.sub(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b', hexrep, txt)
    def rgbrep(m):
        k = tuple(int(x) for x in m.group(1, 2, 3)); a = m.group(4)
        if k not in RGB: return m.group(0)
        tok = RGB[k]
        if tok in ('--bg', '--surface') and a and float(a) > .8: return f'var({tok})'
        pct = round(float(a) * 100, 1) if a else 100
        return f'color-mix(in srgb, var({tok}) {pct:g}%, transparent)'
    txt = re.sub(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)', rgbrep, txt)
    txt = re.sub(r'text-shadow\s*:[^;}"]*', 'text-shadow:none', txt)
    txt = re.sub(r'box-shadow\s*:[^;}"]*color-mix\(in srgb, var\(--(accent|positive|ai)\)[^;}"]*', 'box-shadow:none', txt)
    txt = re.sub(r'animation\s*:\s*gridMove[^;}"]*;?', '', txt)
    txt = re.sub(r'backdrop-filter\s*:[^;}"]*;?|-webkit-backdrop-filter\s*:[^;}"]*;?', '', txt)
    return txt
for f in [a for a in sys.argv[1:] if not a.startswith('--')]:
    s = open(f).read(); o = s
    s = re.sub(r'(<style[^>]*>)(.*?)(</style>)', lambda m: m.group(1) + conv(m.group(2)) + m.group(3), s, flags=re.S)
    s = re.sub(r'(style=")([^"]*)(")', lambda m: m.group(1) + conv(m.group(2)) + m.group(3), s)
    if '--all' in sys.argv:
        s = re.sub(r'(<script>)(.*?)(</script>)', lambda m: m.group(1) + re.sub(r"(['\"])(#[0-9a-fA-F]{3,6}|rgba?\([^)]*\))\1", lambda q: q.group(1) + conv(q.group(2)) + q.group(1), m.group(2)) + m.group(3), s, flags=re.S)
        s = re.sub(r'(<script>)(.*?)(</script>)', lambda m: m.group(1) + re.sub(r"color:(#[0-9a-fA-F]{3,6})", lambda q: 'color:' + conv(q.group(1)), m.group(2)) + m.group(3), s, flags=re.S)
    if s != o: open(f, 'w').write(s); print('swept', f)
