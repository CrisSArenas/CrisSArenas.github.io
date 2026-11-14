import { motion, useReducedMotion } from 'motion/react';
import { Reveal, SectionHead, Arrow, staggerParent, staggerItem, KindBadge } from '@/components/ui';
import { PAPER } from '@/data/site';
import { PROJECTS, LAB } from '@/data/projects';
import { EXPERTISE, PRINCIPLES, PM_EXPERIENCE, ENGINEERING_SCOPE, ASSET_CLASSES } from './content';

function Chip({ children, tone = 'default' }: { children: string; tone?: 'default' | 'tool' }) {
  return (
    <li className={`rounded-full px-2.5 py-1 text-[12.5px] leading-none ring-1 ring-inset ${tone === 'tool' ? 'bg-panel text-ink ring-line' : 'text-muted ring-line-strong'}`}>
      {children}
    </li>
  );
}

/* ---------- Expertise: four areas in an asymmetric bento ---------- */
const SPAN: Record<string, string> = {
  investment: 'lg:col-span-7', quant: 'lg:col-span-5', ai: 'lg:col-span-5', data: 'lg:col-span-7'
};

export function Expertise() {
  return (
    <section aria-labelledby="expertise-h" className="wrap pt-28 md:pt-36">
      <SectionHead id="expertise-h" eyebrow="Expertise" title="Four areas I work in"
        intro="Each with the practice it covers and the tools I use. The working applications on this site show them in use." />
      <motion.ul variants={staggerParent} initial={useReducedMotion() ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        {EXPERTISE.map((e, i) => (
          <motion.li key={e.id} variants={staggerItem} className={`${SPAN[e.id]} flex`}>
            <article className="surface lift group flex w-full flex-col p-6 sm:p-8">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-[1.3rem] font-semibold tracking-tight text-ink">{e.title}</h3>
                <span className="font-mono text-[11px] tracking-[.14em] text-faint" aria-hidden="true">0{i + 1}</span>
              </div>
              <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted">{e.sentence}</p>
              {e.covers.length > 0 && (
                <div className="mt-6">
                  <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">Covers</div>
                  <ul className="flex flex-wrap gap-1.5" aria-label={`${e.title}: practice areas`}>
                    {e.covers.map(c => <Chip key={c}>{c}</Chip>)}
                  </ul>
                </div>
              )}
              <div className="mt-5">
                <div className="mb-2.5 font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">Tools</div>
                <ul className="flex flex-wrap gap-1.5" aria-label={`${e.title}: tools`}>
                  {e.tools.map(t => <Chip key={t} tone="tool">{t}</Chip>)}
                </ul>
              </div>
              <a href={e.link.href} className="group/l mt-auto inline-flex items-center gap-2 pt-7 text-[13.5px] text-teal no-underline">
                <span className="link">{e.link.label}</span><Arrow className="group-hover/l:translate-x-1" />
              </a>
            </article>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

/* ---------- How I work: principles, each pointing to where the site shows it ---------- */
export function HowIWork() {
  return (
    <section aria-labelledby="how-h" className="wrap pt-28 md:pt-36">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <div className="eyebrow mb-4">How I work</div>
            <h2 id="how-h" className="display text-[clamp(2rem,4.2vw,3.2rem)] text-ink">Principles you can check</h2>
            <p className="lede mt-5 max-w-md">Each one is built into the applications on this site. Follow the link beside it to see it working.</p>
          </Reveal>
        </div>
        <motion.ol variants={staggerParent} initial={useReducedMotion() ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          className="border-t border-line">
          {PRINCIPLES.map((p, i) => (
            <motion.li key={p.title} variants={staggerItem} className="grid gap-x-6 gap-y-2 border-b border-line py-7 sm:grid-cols-[3rem_minmax(0,1fr)] sm:py-8">
              <span className="num font-mono text-[13px] text-teal" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-[1.15rem] font-semibold tracking-tight text-ink">{p.title}</h3>
                <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-muted">{p.body}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">Where it shows</span>
                  {p.where.map(w => (
                    <a key={w.href} href={w.href} className="group inline-flex min-h-8 items-center gap-1.5 text-[13.5px] text-teal no-underline">
                      <span className="link">{w.label}</span><Arrow />
                    </a>
                  ))}
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}

/* ---------- Experience: only what the site states ---------- */
export function Experience() {
  const apps = PROJECTS.length;
  const sims = LAB.filter(l => l.kind === 'Simulation').length;
  const writeups = LAB.filter(l => l.kind === 'Technical write-up').length;
  return (
    <section aria-labelledby="exp-h" className="wrap pt-28 md:pt-36">
      <SectionHead id="exp-h" eyebrow="Experience" title="Portfolios, research and engineering" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-7 lg:row-span-2">
          <article className="surface flex h-full flex-col p-7 sm:p-10">
            <div className="eyebrow">Portfolio management</div>
            <svg viewBox="0 0 32 24" className="mt-8 h-6 w-8 text-sand" fill="currentColor" aria-hidden="true"><path d="M0 24V14.4C0 6.6 4.2 1.8 12.6 0l1.2 3.3C9.4 4.7 7.4 7.4 7.2 11.4H13V24H0zm18.2 0V14.4C18.2 6.6 22.4 1.8 30.8 0L32 3.3c-4.4 1.4-6.4 4.1-6.6 8.1h5.8V24H18.2z" /></svg>
            <blockquote className="mt-5 text-[clamp(1.35rem,2.4vw,1.85rem)] font-medium leading-[1.35] tracking-[-.015em] text-ink">
              <p className="relative">{PM_EXPERIENCE}</p>
            </blockquote>
            <p className="mt-6 max-w-[54ch] text-[15px] leading-relaxed text-muted">
              The portfolio management applications on this site show the same work in practice, from risk and attribution to policy portfolios, rebalancing and commitment pacing.
            </p>
            <div className="mt-8 border-t border-line pt-6">
              <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">Across public and private markets</div>
              <ul className="flex flex-wrap gap-1.5" aria-label="Asset classes">
                {ASSET_CLASSES.map(a => <Chip key={a}>{a}</Chip>)}
              </ul>
            </div>
            <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-8">
              <a href="/work/" className="group inline-flex min-h-10 items-center gap-2 text-[14px] text-teal no-underline"><span className="link">See the work</span><Arrow /></a>
              <a href="/research/" className="group inline-flex min-h-10 items-center gap-2 text-[14px] text-teal no-underline"><span className="link">Investment memos and notes</span><Arrow /></a>
            </div>
          </article>
        </Reveal>
        <Reveal className="lg:col-span-5" delay={.08}>
          <article className="surface flex h-full flex-col p-7 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="eyebrow">Published research</div>
              <KindBadge kind="Published paper" />
            </div>
            <h3 className="mt-5 text-[1.08rem] font-semibold leading-snug tracking-tight text-ink">{PAPER.title}</h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted">Regime-aware deep learning for multi-asset allocation, published on SSRN.</p>
            <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-6 text-[13.5px]">
              <a href={PAPER.ssrn} target="_blank" rel="noopener" className="group inline-flex min-h-10 items-center gap-1.5 text-teal no-underline"><span className="link">SSRN</span><Arrow /></a>
              <a href={PAPER.pdf} className="group inline-flex min-h-10 items-center gap-1.5 text-teal no-underline"><span className="link">PDF</span><Arrow /></a>
              <a href={PAPER.summary} className="group inline-flex min-h-10 items-center gap-1.5 text-teal no-underline"><span className="link">Plain-language summary</span><Arrow /></a>
            </div>
          </article>
        </Reveal>
        <Reveal className="lg:col-span-5" delay={.14}>
          <article className="surface flex h-full flex-col p-7 sm:p-8">
            <div className="eyebrow">Engineering</div>
            <p className="mt-5 text-[14.5px] leading-relaxed text-muted">{ENGINEERING_SCOPE}</p>
            <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
              {[[apps, 'Working applications'], [sims, 'Simulators'], [writeups, 'Technical write-ups']].map(([n, l]) => (
                <div key={String(l)}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="num text-[1.75rem] font-semibold tracking-tight text-ink">{n}</dd>
                  <dd className="mt-0.5 text-[12px] leading-snug text-faint" aria-hidden="true">{l}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-6 text-[13.5px]">
              <a href="/work/" className="group inline-flex min-h-10 items-center gap-1.5 text-teal no-underline"><span className="link">Applications</span><Arrow /></a>
              <a href="/lab/" className="group inline-flex min-h-10 items-center gap-1.5 text-teal no-underline"><span className="link">Engineering Lab</span><Arrow /></a>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Next: where to go from here ---------- */
const NEXT = [
  { href: '/work/', label: 'Work', text: 'Working applications with a case study for each.' },
  { href: '/research/', label: 'Research', text: 'The published paper, investment memos and practitioner notes.' },
  { href: '/lab/', label: 'Lab', text: 'Robotics, embedded and edge ML simulators, with technical write-ups.' },
  { href: '/contact/', label: 'Contact', text: 'Email or LinkedIn.' }
];

export function NextLinks() {
  return (
    <section aria-labelledby="next-h" className="wrap pt-28 md:pt-36">
      <Reveal><h2 id="next-h" className="eyebrow mb-6">Continue</h2></Reveal>
      <motion.ul variants={staggerParent} initial={useReducedMotion() ? false : 'hidden'} whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        className="grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {NEXT.map(n => (
          <motion.li key={n.href} variants={staggerItem} className="flex bg-card">
            <a href={n.href} className="group flex w-full flex-col gap-10 p-6 no-underline transition-colors duration-300 hover:bg-panel sm:p-7">
              <span className="flex items-center justify-between text-[1.25rem] font-semibold tracking-tight text-ink">
                {n.label}
                <span className="grid size-9 place-items-center rounded-full ring-1 ring-line-strong text-muted transition-colors duration-300 group-hover:text-teal group-hover:ring-teal"><Arrow /></span>
              </span>
              <span className="text-[14px] leading-relaxed text-muted">{n.text}</span>
            </a>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
