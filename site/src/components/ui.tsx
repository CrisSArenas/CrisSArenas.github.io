import { useId, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react';

/* Reveal: fades and lifts content into place once as it scrolls into view. */
export function Reveal({ children, delay = 0, y = 18, className = '', as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'section' | 'li' | 'article' }) {
  const M = motion[as];
  const reduce = useReducedMotion();
  return (
    <M className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: .7, delay, ease: [.25, 1, .5, 1] }}>
      {children}
    </M>
  );
}

/* Stagger: children marked with `stagger-item` animate in sequence. */
export const staggerParent: Variants = { hidden: {}, show: { transition: { staggerChildren: .07, delayChildren: .05 } } };
export const staggerItem: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: .6, ease: [.25, 1, .5, 1] } } };

export function SectionHead({ eyebrow, title, intro, align = 'left', id }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; align?: 'left' | 'center'; id?: string }) {
  return (
    <Reveal className={`mb-12 max-w-3xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <div className="eyebrow mb-4">{eyebrow}</div>}
      <h2 id={id} className="display text-[clamp(2rem,4.2vw,3.2rem)] text-ink">{title}</h2>
      {intro && <p className="lede mt-5">{intro}</p>}
    </Reveal>
  );
}

type BtnVariant = 'primary' | 'sand' | 'outline' | 'ghost';
const btn: Record<BtnVariant, string> = {
  primary: 'bg-btn text-btn-ink hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--c-btn)_18%,transparent)]',
  sand: 'bg-sand text-[#0B0E11] hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--c-gold)_22%,transparent)]',
  outline: 'text-ink ring-1 ring-inset ring-line-strong hover:ring-teal',
  ghost: 'text-muted hover:text-ink hover:bg-panel'
};
export function Button({ href, children, variant = 'primary', className = '', external = false, size = 'md' }: { href: string; children: ReactNode; variant?: BtnVariant; className?: string; external?: boolean; size?: 'sm' | 'md' }) {
  return (
    <motion.a href={href} whileTap={{ scale: .97 }} {...(external ? { target: '_blank', rel: 'noopener' } : {})}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium no-underline transition-[box-shadow,background-color,color] duration-200 ${size === 'sm' ? 'px-4 py-2 text-[13.5px]' : 'px-6 py-3 text-[15px]'} ${btn[variant]} ${className}`}>
      {children}
    </motion.a>
  );
}

export function Arrow({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 16 16" className={`size-3.5 transition-transform duration-300 group-hover:translate-x-1 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>;
}

export function Tag({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'teal' | 'sand' }) {
  const t = tone === 'teal' ? 'text-teal ring-teal/30 bg-teal/[.06]' : tone === 'sand' ? 'text-sand-ink ring-sand/30 bg-sand/[.06]' : 'text-muted ring-line-strong';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] leading-none ring-1 ring-inset ${t}`}>{children}</span>;
}

/* What kind of thing this is, so real implementations, simulations and write-ups are never confused. */
export function KindBadge({ kind }: { kind: string }) {
  const tone = kind === 'Working application' ? 'bg-teal' : kind === 'Simulation' ? 'bg-sand' : kind === 'Research' || kind === 'Published paper' ? 'bg-ink' : 'bg-graphite-2';
  return <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.12em] text-faint"><span className={`size-1.5 rounded-full ${tone}`} />{kind}</span>;
}

export function Stat({ value, label, className = '' }: { value: ReactNode; label: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="num text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-[13px] leading-snug text-muted">{label}</div>
    </div>
  );
}

/* Progressive disclosure: a plain summary first, the technical detail one click away. */
export function Disclosure({ title, children, defaultOpen = false, hint }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; hint?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="surface-2 overflow-hidden">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium text-ink">
        <span>{title}{hint && <span className="ml-3 hidden font-normal text-faint sm:inline">{hint}</span>}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} className="grid size-7 shrink-0 place-items-center rounded-full ring-1 ring-line-strong text-muted" aria-hidden="true">
          <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 1v10M1 6h10" /></svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .35, ease: [.25, 1, .5, 1] }}>
            <div className="border-t border-line px-5 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Tabs with an animated indicator. */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  const lid = useId();
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-panel p-1 ring-1 ring-line [scrollbar-width:none]">
      {tabs.map(t => (
        <button key={t.id} role="tab" type="button" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`relative shrink-0 rounded-full px-4 py-2 text-[13.5px] transition-colors ${value === t.id ? 'text-ink' : 'text-muted hover:text-ink'}`}>
          {value === t.id && <motion.span layoutId={`tab-${lid}`} className="absolute inset-0 -z-0 rounded-full bg-card ring-1 ring-line-strong" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="relative">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
