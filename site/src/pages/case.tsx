import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { mount, rootSlug } from '@/lib/mount';
import { Reveal, Button, Arrow, Tag, KindBadge, Disclosure, staggerParent, staggerItem } from '@/components/ui';
import { MiniChart } from '@/components/MiniChart';
import { AREAS, PROJECTS, bySlug, statFor, type Project } from '@/data/projects';
import { caseFor, type CaseStudy } from '@/data/cases';
import { ArchitectureDiagram } from '@/components/work/ArchitectureDiagram';
import { Preview } from '@/components/work/Preview';
import '@/components/work/work.css';

const ease = [.25, 1, .5, 1] as const;

function BackArrow({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={`size-3.5 transition-transform duration-300 group-hover:-translate-x-1 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" /></svg>;
}

function Hero({ p, c }: { p: Project; c: CaseStudy }) {
  const s = statFor(p);
  return (
    <section className="relative overflow-hidden" aria-labelledby="case-h">
      <div className="grid-bg case-hero-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="wrap pt-28 md:pt-40">
        <motion.nav aria-label="Breadcrumb" className="mb-10 text-[13px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .5 }}>
          <a href="/work/" className="group inline-flex items-center gap-2 text-muted no-underline transition-colors hover:text-ink">
            <BackArrow /> All work
          </a>
        </motion.nav>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease }}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <KindBadge kind={p.kind} />
              <span className="text-faint" aria-hidden="true">·</span>
              <a href={`/work/?area=${p.area}`} className="font-mono text-[11px] uppercase tracking-[.12em] text-teal no-underline hover:underline">{AREAS[p.area].label}</a>
            </div>
            <h1 id="case-h" className="display mt-6 max-w-[18ch] text-[clamp(2.3rem,5.6vw,4.6rem)] text-ink">{p.title}</h1>
            <p className="lede mt-7 max-w-[62ch]">{c.plain}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button href={p.href} className="group">Open the application <Arrow /></Button>
              <Button href="#how" variant="ghost">How it works</Button>
            </div>
            {(p.memo || p.note) && (
              <ul className="mt-8 grid max-w-2xl list-none gap-3 p-0 sm:grid-cols-2">
                {([['Investment memo', p.memo], ['Practitioner note', p.note]] as const).filter(([, d]) => d).map(([k, d]) => (
                  <li key={k}>
                    <a href={d!.href} className="group flex h-full items-start justify-between gap-4 rounded-2xl border border-line bg-card/60 px-4 py-3.5 no-underline transition-colors hover:border-teal/50">
                      <span className="min-w-0">
                        <span className="block font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">{k}</span>
                        <span className="mt-1.5 block text-[14px] leading-snug text-ink">{d!.title}</span>
                      </span>
                      <Arrow className="mt-1 shrink-0 text-muted group-hover:text-teal" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
          {s && (
            <motion.aside aria-label="Key number at the base case" className="surface self-end p-6 sm:p-7"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .15, ease }}>
              <div className="eyebrow">Key number, base case</div>
              <div className="num mt-5 text-[clamp(2.8rem,5vw,3.8rem)] font-semibold leading-none tracking-[-.03em] text-ink">{s.value}</div>
              <div className="mt-3 text-[15px] leading-snug text-muted">{s.label}</div>
              <div className="mt-6 border-t border-line pt-5"><MiniChart stat={s} className="max-h-[96px]" /></div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-faint">Computed by the application at its base case on synthetic data.</p>
            </motion.aside>
          )}
        </div>
        <Reveal className="mt-14 flex gap-4 rounded-2xl border border-line bg-panel/70 px-5 py-4 sm:px-6">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-teal" aria-hidden="true" />
          <p className="m-0 text-[14px] leading-relaxed text-muted"><span className="font-medium text-ink">What is real here.</span> {c.nature}</p>
        </Reveal>
      </div>
    </section>
  );
}

/* A section with its number and name in a rail on the left at desktop widths. */
function Section({ n, id, title, children, wide = false }: { n: string; id: string; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className="wrap pt-24 md:pt-32" aria-labelledby={id}>
      <div className={wide ? '' : 'grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,8fr)] lg:gap-16'}>
        <Reveal className={wide ? 'mb-10 flex items-baseline gap-4' : 'lg:sticky lg:top-28 lg:self-start'}>
          <div className="font-mono text-[11px] tracking-[.14em] text-faint">{n}</div>
          <h2 id={id} className={`display text-[clamp(1.7rem,3.2vw,2.5rem)] text-ink ${wide ? '' : 'mt-3'}`}>{title}</h2>
        </Reveal>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function Problem({ c }: { c: CaseStudy }) {
  const [lead, ...rest] = c.problem;
  return (
    <Section n="01" id="problem" title="The problem">
      <Reveal>
        <p className="m-0 max-w-[60ch] text-[clamp(1.15rem,1.8vw,1.4rem)] leading-[1.55] tracking-[-.01em] text-ink">{lead}</p>
        {rest.map((t, i) => <p key={i} className="mt-5 max-w-[62ch] text-[16px] leading-[1.75] text-muted">{t}</p>)}
      </Reveal>
    </Section>
  );
}

function Built({ c }: { c: CaseStudy }) {
  return (
    <Section n="02" id="built" title="What I built">
      <Reveal className="prose-site max-w-[64ch] text-[16px]">
        {c.built.map((t, i) => <p key={i}>{t}</p>)}
      </Reveal>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Reveal className="surface-2 p-5">
          <div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">Parts I designed</div>
          <ul className="mt-4 flex list-none flex-wrap gap-1.5 p-0">{c.pieces.map(x => <li key={x}><Tag tone="teal">{x}</Tag></li>)}</ul>
        </Reveal>
        <Reveal className="surface-2 p-5" delay={.06}>
          <div className="font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">Views in the application</div>
          <ol className="mt-4 list-none space-y-2 p-0">
            {c.tabs.map((t, i) => (
              <li key={t} className="flex items-baseline gap-3 text-[14px] text-ink"><span className="num font-mono text-[11px] text-faint">{String(i + 1).padStart(2, '0')}</span>{t}</li>
            ))}
          </ol>
        </Reveal>
      </div>
    </Section>
  );
}

function HowItWorks({ p, c }: { p: Project; c: CaseStudy }) {
  return (
    <Section n="03" id="how" title="How it works" wide>
      <Reveal><ArchitectureDiagram nodes={c.flow.nodes} edges={c.flow.edges} caption={c.flow.caption} title={p.title} /></Reveal>
    </Section>
  );
}

function Hood({ c }: { c: CaseStudy }) {
  return (
    <Section n="04" id="hood" title="Under the hood">
      <Reveal><p className="m-0 mb-6 max-w-[60ch] text-[15px] leading-relaxed text-muted">Methods, formulas, assumptions and limits, as the application's own How it works panel states them.</p></Reveal>
      <motion.div className="space-y-3" variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}>
        {c.hood.map(h => (
          <motion.div key={h.title} variants={staggerItem}>
            <Disclosure title={h.title} hint={h.hint}>
              {h.paras?.map((t, i) => <p key={i} className="m-0 mb-3 max-w-[70ch] text-[14.5px] leading-[1.7] text-muted last:mb-0">{t}</p>)}
              {h.list && (
                <ul className="m-0 list-none space-y-2.5 p-0">
                  {h.list.map((t, i) => <li key={i} className="flex gap-3 text-[14.5px] leading-[1.65] text-muted"><span className="mt-[.6em] size-1 shrink-0 rounded-full bg-graphite-2" aria-hidden="true" />{t}</li>)}
                </ul>
              )}
              {h.formulas && (
                <pre className="m-0 overflow-x-auto rounded-xl border border-line bg-page px-4 py-4 font-mono text-[12.5px] leading-[1.9] text-ink [scrollbar-width:thin]" tabIndex={0} aria-label="Formulas in plain text">
                  {h.formulas.join('\n')}
                </pre>
              )}
            </Disclosure>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

function Shows({ p, c }: { p: Project; c: CaseStudy }) {
  return (
    <Section n="05" id="shows" title="What it shows" wide>
      <motion.ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3" variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}>
        {c.results.map((r, i) => (
          <motion.li key={r.label} variants={staggerItem} className={`surface flex flex-col p-6 ${i === 0 ? 'md:bg-panel' : ''}`}>
            <div className="num text-[clamp(2rem,3.4vw,2.6rem)] font-semibold leading-none tracking-[-.03em] text-ink">{r.value}</div>
            <div className="mt-3 text-[14.5px] font-medium leading-snug text-ink">{r.label}</div>
            <p className="m-0 mt-3 text-[14px] leading-relaxed text-muted">{r.detail}</p>
          </motion.li>
        ))}
      </motion.ul>
      <Reveal className="mt-5 text-[13px] leading-relaxed text-faint">
        <p className="m-0">These results come from synthetic data, read from the application at its base case. {c.baseCase} Change the inputs in the application and they move.</p>
      </Reveal>
      <Reveal className="mt-14">
        <figure className="m-0">
          <a href={p.href} className="shot-frame group block no-underline" aria-label={`Open the ${p.title} application`}>
            <div className="shot-bar" aria-hidden="true"><i /><i /><i /><span className="ml-3 truncate font-mono text-[11px] text-faint">{p.href.replace(/^\//, '')}</span></div>
            <div className="relative aspect-[16/10] overflow-hidden bg-panel"><Preview slug={p.slug} title={p.title} sizes="(min-width: 1200px) 1152px, 100vw" className="transition-transform duration-700 group-hover:scale-[1.015] motion-reduce:transition-none" /></div>
          </a>
          <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
            <span>The application at its base case, as it opens in the browser.</span>
            <a href={p.href} className="group inline-flex items-center gap-2 font-medium text-teal no-underline">Open the application <Arrow /></a>
          </figcaption>
        </figure>
      </Reveal>
    </Section>
  );
}

function PrevNext({ p }: { p: Project }) {
  const i = PROJECTS.findIndex(x => x.slug === p.slug);
  const prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length], next = PROJECTS[(i + 1) % PROJECTS.length];
  const Card = ({ q, dir }: { q: Project; dir: 'Previous' | 'Next' }) => (
    <a href={`/work/${q.slug}/`} className={`pcard group surface flex min-h-[132px] flex-col justify-between gap-6 p-6 no-underline ${dir === 'Next' ? 'sm:items-end sm:text-right' : ''}`}>
      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.14em] text-faint">
        {dir === 'Previous' && <BackArrow />}{dir} case study{dir === 'Next' && <Arrow />}
      </span>
      <span>
        <span className="block text-[1.2rem] font-semibold leading-tight tracking-[-.02em] text-ink">{q.title}</span>
        <span className="mt-1.5 block text-[13px] text-muted">{AREAS[q.area].label}</span>
      </span>
    </a>
  );
  return (
    <nav className="wrap pt-28 md:pt-36" aria-label="More case studies">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card q={prev} dir="Previous" />
        <Card q={next} dir="Next" />
      </div>
      <div className="mt-8 flex justify-center">
        <Button href="/work/" variant="outline">All work <Arrow /></Button>
      </div>
    </nav>
  );
}

function Missing() {
  return (
    <section className="wrap pt-40">
      <h1 className="display text-5xl text-ink">Case study not found</h1>
      <p className="lede mt-6">This case study does not exist. The full list is on the Work page.</p>
      <div className="mt-8"><Button href="/work/">All work <Arrow /></Button></div>
    </section>
  );
}

function Page() {
  const p = bySlug(rootSlug());
  const c = p && caseFor(p.slug);
  if (!p || !c) return <Missing />;
  return (
    <>
      <Hero p={p} c={c} />
      <Problem c={c} />
      <Built c={c} />
      <HowItWorks p={p} c={c} />
      <Hood c={c} />
      <Shows p={p} c={c} />
      <PrevNext p={p} />
    </>
  );
}
mount(<Page />);
