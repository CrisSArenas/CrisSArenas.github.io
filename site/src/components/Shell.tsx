import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, MotionConfig } from 'motion/react';
import { NAV, NAME, TITLE, EMAIL, LINKEDIN } from '@/data/site';
import { useTheme } from '@/lib/theme';

function ThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <button type="button" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:text-ink hover:bg-panel">
      <motion.svg key={theme} initial={{ rotate: -40, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: .35 }}
        viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        {theme === 'dark'
          ? <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
      </motion.svg>
    </button>
  );
}

function currentPath(): string {
  return typeof location === 'undefined' ? '/' : location.pathname;
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const path = currentPath();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);
  const active = (href: string) => path === href || (href !== '/' && path.startsWith(href));
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${scrolled || open ? 'border-b border-line bg-[var(--c-glass)] backdrop-blur-xl backdrop-saturate-150' : 'border-b border-transparent'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">Skip to content</a>
      <nav className="wrap flex h-16 items-center justify-between" aria-label="Site">
        <a href="/" className="group flex items-center gap-3 text-[15px] font-semibold tracking-tight text-ink no-underline">
          <span className="grid size-8 place-items-center rounded-lg border border-line-strong bg-panel font-mono text-[11px] text-teal transition-colors group-hover:border-teal">CA</span>
          <span>{NAME}</span>
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map(n => (
            <li key={n.href} className="relative">
              <a href={n.href} aria-current={active(n.href) ? 'page' : undefined}
                className={`relative block rounded-full px-3.5 py-2 text-[13.5px] no-underline transition-colors ${active(n.href) ? 'text-ink' : 'text-muted hover:text-ink'}`}>
                {active(n.href) && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-panel ring-1 ring-line" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button type="button" className="grid size-10 place-items-center rounded-full text-ink md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <motion.path animate={open ? { d: 'M6 6l12 12' } : { d: 'M4 8h16' }} />
              <motion.path animate={open ? { d: 'M6 18L18 6' } : { d: 'M4 16h16' }} />
            </svg>
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .3, ease: [.25, 1, .5, 1] }}
            className="overflow-hidden border-t border-line md:hidden">
            <ul className="wrap flex flex-col py-3">
              {NAV.map((n, i) => (
                <motion.li key={n.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .04 * i }}>
                  <a href={n.href} className={`flex items-center justify-between rounded-xl px-3 py-3.5 text-lg no-underline ${active(n.href) ? 'text-teal' : 'text-ink'}`}>
                    {n.label}<span className="font-mono text-xs text-faint">0{i + 1}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="text-[15px] font-semibold text-ink">{NAME}</div>
          <div className="mt-1 text-sm text-muted">{TITLE}</div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-faint">The applications on this site run in the browser on synthetic data and fictional companies and funds. Nothing here is investment advice.</p>
        </div>
        <div>
          <div className="eyebrow mb-4">Explore</div>
          <ul className="space-y-2.5 text-sm">
            {[['/work/', 'Work'], ['/research/', 'Research'], ['/lab/', 'Engineering Lab'], ['/ai-systems.html', 'AI systems deep dive'], ['/notes/', 'Practitioner notes'], ['/tests.html', 'Model tests']].map(([h, l]) => (
              <li key={h}><a className="text-muted no-underline transition-colors hover:text-ink" href={h}>{l}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4">Contact</div>
          <ul className="space-y-2.5 text-sm">
            <li><a className="text-muted no-underline transition-colors hover:text-ink" href={`mailto:${EMAIL}`}>Email</a></li>
            <li><a className="text-muted no-underline transition-colors hover:text-ink" href={LINKEDIN} target="_blank" rel="noopener">LinkedIn</a></li>
            <li><a className="text-muted no-underline transition-colors hover:text-ink" href="/about/">About</a></li>
          </ul>
        </div>
      </div>
      <div className="wrap border-t border-line py-6 text-xs text-faint">&copy; {new Date().getFullYear()} {NAME}</div>
    </footer>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: .3 });
  return <motion.div aria-hidden="true" style={{ scaleX: x }} className="fixed inset-x-0 top-0 z-[60] h-px origin-left bg-teal/70" />;
}

/* Page shell: navigation, a gentle page-enter transition, footer. Motion respects the user's reduced-motion setting. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ScrollProgress />
      <Nav />
      <motion.main id="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease: [.25, 1, .5, 1] }}>
        {children}
      </motion.main>
      <Footer />
    </MotionConfig>
  );
}
