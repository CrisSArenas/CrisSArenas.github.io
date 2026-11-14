import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Arrow, KindBadge, Tag, staggerItem, staggerParent } from '@/components/ui';
import { MiniChart } from '@/components/MiniChart';
import { statFor, type LabItem, type Project } from '@/data/projects';

const cardHover = 'transition-[border-color,transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--c-green)_45%,var(--c-border))] hover:shadow-[0_18px_40px_-18px_var(--c-shade-2)] motion-reduce:transition-none motion-reduce:hover:translate-y-0';

/* A working application with its base-case number and card chart. */
export function AppCard({ p }: { p: Project }) {
  const s = statFor(p);
  return (
    <motion.article variants={staggerItem} className={`surface group relative flex flex-col p-6 sm:p-7 ${cardHover}`}>
      <div className="flex items-center justify-between gap-4"><KindBadge kind={p.kind} /><span className="text-teal" aria-hidden="true"><Arrow /></span></div>
      <h3 className="mt-5 text-[1.3rem] font-semibold tracking-tight text-ink">
        <a href={p.href} className="no-underline after:absolute after:inset-0 after:rounded-[20px] after:content-['']">{p.title}</a>
      </h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{p.summary}</p>
      {s && (
        <div className="mt-6 grid grid-cols-[auto_1fr] items-end gap-5 rounded-2xl border border-line bg-panel p-4">
          <div>
            <div className="num text-[1.7rem] font-semibold leading-none tracking-tight text-ink">{s.value}</div>
            <div className="mt-1.5 max-w-[16ch] text-[12px] leading-snug text-muted">{s.label}</div>
          </div>
          <MiniChart stat={s} className="max-h-16" />
        </div>
      )}
      <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Topics">{p.tags.map(t => <li key={t}><Tag>{t}</Tag></li>)}</ul>
    </motion.article>
  );
}

/* A robotics or embedded project with screenshots of the page in both themes. */
export function LabCard({ item }: { item: LabItem }) {
  const sim = item.kind === 'Simulation';
  const src = (t: string) => `/assets/previews/lab-${item.slug}-${t}.webp`;
  return (
    <motion.article variants={staggerItem} className={`surface group relative flex flex-col overflow-hidden ${cardHover}`}>
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-panel">
        <img src={src('dark')} alt="" loading="lazy" decoding="async" width={720} height={450}
          className="hidden size-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none dark:block" />
        <img src={src('light')} alt="" loading="lazy" decoding="async" width={720} height={450}
          className="block size-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none dark:hidden" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[color-mix(in_srgb,var(--c-card)_70%,transparent)] to-transparent" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <KindBadge kind={item.kind} />
        <h4 className="mt-3 text-[1.1rem] font-semibold tracking-tight text-ink">
          <a href={item.href} className="no-underline after:absolute after:inset-0 after:content-['']">{item.title}</a>
        </h4>
        <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{item.summary}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Topics">{item.tags.map(t => <li key={t}><Tag>{t}</Tag></li>)}</ul>
        <span className="mt-5 inline-flex items-center gap-2 text-[13.5px] font-medium text-teal">{sim ? 'Open the simulator' : 'Read the write-up'} <Arrow /></span>
      </div>
    </motion.article>
  );
}

export function CardGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -8% 0px' }} className={className}>
      {children}
    </motion.div>
  );
}
