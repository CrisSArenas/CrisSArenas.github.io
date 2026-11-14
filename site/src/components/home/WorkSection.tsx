import { motion } from 'motion/react';
import { SectionHead, KindBadge, Tag, Arrow, Button, staggerParent, staggerItem } from '@/components/ui';
import { MiniChart } from '@/components/MiniChart';
import { FEATURED, PROJECTS, AREAS, bySlug, statFor, type Project } from '@/data/projects';

type Size = 'lg' | 'md' | 'wide';
/* bento order: one large portfolio card beside an AI card, three research and allocation cards, then a wide card */
const LAYOUT: { slug: string; size: Size }[] = [
  { slug: 'portfolio-risk-performance', size: 'lg' },
  { slug: 'ai-engineering-lab', size: 'md' },
  { slug: 'allocation-lab', size: 'md' },
  { slug: 'systematic-research-lab', size: 'md' },
  { slug: 'multi-strategy-builder', size: 'md' },
  { slug: 'agentic-portfolio-monitor', size: 'wide' }
];
const SPAN: Record<Size, string> = { lg: 'md:col-span-2 lg:col-span-4', md: 'lg:col-span-2', wide: 'md:col-span-2 lg:col-span-6' };

function Card({ p, size }: { p: Project; size: Size }) {
  const s = statFor(p);
  const big = size !== 'md';
  return (
    <article className={`work-card surface group relative flex h-full flex-col overflow-hidden p-6 sm:p-7 ${size === 'wide' ? 'lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12' : ''}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3">
          <KindBadge kind={p.kind} />
          {big && <span className="hidden sm:inline font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">{AREAS[p.area].label}</span>}
        </div>
        <h3 className={`mt-5 font-semibold tracking-[-.02em] text-ink ${big ? 'text-[clamp(1.35rem,2.2vw,1.7rem)] leading-tight' : 'text-[19px] leading-snug'}`}>
          <a href={`/work/${p.slug}/`} className="no-underline outline-none after:absolute after:inset-0 after:rounded-[20px] after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-teal focus-visible:after:outline-offset-[-2px]">{p.title}</a>
        </h3>
        <p className={`mt-3 leading-relaxed text-muted ${big ? 'max-w-lg text-[15.5px]' : 'text-[14.5px]'}`}>{p.summary}</p>
        {size === 'lg' && <ul className="mt-5 flex flex-wrap gap-2">{p.tags.slice(0, 4).map(t => <li key={t}><Tag>{t}</Tag></li>)}</ul>}
        {size === 'wide' && <ul className="mt-5 flex flex-wrap gap-2">{p.tags.map(t => <li key={t}><Tag>{t}</Tag></li>)}</ul>}
      </div>

      <div className={`flex flex-col ${size === 'wide' ? 'mt-7 lg:mt-0 lg:justify-center' : 'mt-7'}`}>
        {s && (
          <div className={`grid items-end gap-5 ${size === 'md' ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : 'grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]'}`}>
            <div>
              <div className={`num font-semibold leading-none tracking-tight text-ink ${big ? 'text-[clamp(2.2rem,3.6vw,2.9rem)]' : 'whitespace-nowrap text-[26px] xl:text-[30px]'}`}>{s.value}</div>
              <div className="mt-2 text-[12.5px] leading-snug text-muted">{s.label}</div>
            </div>
            <div className={`rounded-xl border border-line bg-page/40 p-3 ${big ? 'w-full max-w-[300px] justify-self-end' : ''}`}><MiniChart stat={s} /></div>
          </div>
        )}
        {size === 'md' && <ul className="mt-5 flex flex-wrap gap-2">{p.tags.slice(0, 2).map(t => <li key={t}><Tag>{t}</Tag></li>)}</ul>}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4 text-[13.5px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-ink">Case study <Arrow className="text-teal" /></span>
          <a href={p.href} className="relative z-10 inline-flex items-center gap-1.5 py-1 text-muted no-underline transition-colors hover:text-teal">
            Open the application
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5" /></svg>
          </a>
        </div>
      </div>
    </article>
  );
}

export function WorkSection() {
  const cards = LAYOUT.map(l => ({ ...l, p: bySlug(l.slug)! })).filter(c => c.p && FEATURED.includes(c.p));
  return (
    <section id="work" aria-labelledby="work-h" className="relative py-20 sm:py-28">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-line" />
      <div className="wrap">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHead id="work-h" eyebrow="Selected work" title="Working applications"
            intro="Each one runs real computation in your browser on synthetic data. The number on each card is what the application computes at its base case." />
          <div className="mb-12 shrink-0"><Button href="/work/" variant="outline" size="sm" className="group">All {PROJECTS.length} applications <Arrow /></Button></div>
        </div>
        <motion.div variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -8% 0px' }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {cards.map(c => (
            <motion.div key={c.slug} variants={staggerItem} className={SPAN[c.size]}><Card p={c.p} size={c.size} /></motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
