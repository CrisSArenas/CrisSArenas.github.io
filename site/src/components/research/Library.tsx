import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Arrow } from '@/components/ui';
import { LIBRARY, type DocType, type LibraryItem } from '@/data/research';
import { AREAS, type AreaId } from '@/data/projects';

type AreaF = 'all' | AreaId;
type TypeF = 'all' | DocType;
const AREA_ORDER: AreaId[] = (['portfolio', 'quant', 'private', 'ai'] as AreaId[]).filter(a => LIBRARY.some(d => d.area === a));

function Chip({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: ReactNode; count: number }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`relative inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-[13.5px] transition-colors ${on ? 'text-ink' : 'text-muted hover:text-ink'}`}>
      {on && <motion.span layoutId="lib-chip" className="absolute inset-0 rounded-full bg-card ring-1 ring-line-strong" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
      <span className="relative">{children}</span>
      <span className="num relative font-mono text-[11px] text-faint">{count}</span>
    </button>
  );
}

function Row({ d }: { d: LibraryItem }) {
  const memo = d.type === 'Investment memo';
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .3, ease: [.25, 1, .5, 1] }}
      className="border-t border-line first:border-t-0">
      <div className="group relative grid gap-2 py-5 sm:grid-cols-[150px_1fr_auto] sm:items-baseline sm:gap-6">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.12em] text-faint">
          <span className={`size-1.5 rounded-full ${memo ? 'bg-sand' : 'bg-teal'}`} aria-hidden="true" />{d.type}
        </span>
        <div className="min-w-0">
          <h4 className="text-[1.02rem] font-medium tracking-tight text-ink">
            <a href={d.href} className="no-underline after:absolute after:inset-0 after:content-[''] group-hover:text-teal">{d.title}</a>
          </h4>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">{d.desc}</p>
          <p className="mt-2 text-[12.5px] text-faint">Draws on <a href={d.app.href} className="link relative z-[1]">{d.app.title}</a></p>
        </div>
        <span className="hidden text-teal sm:block" aria-hidden="true"><Arrow /></span>
      </div>
    </motion.li>
  );
}

/* The investment memos and practitioner notes, grouped by area and filterable by area and type. */
export function Library() {
  const [area, setArea] = useState<AreaF>('all');
  const [type, setType] = useState<TypeF>('all');
  const match = (d: LibraryItem, a: AreaF, t: TypeF) => (a === 'all' || d.area === a) && (t === 'all' || d.type === t);
  const shown = LIBRARY.filter(d => match(d, area, type));
  const groups = AREA_ORDER.map(a => ({ a, items: shown.filter(d => d.area === a) })).filter(g => g.items.length);

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <LayoutGroup id="lib-area">
          <div role="group" aria-label="Filter by area" className="flex flex-wrap gap-1 rounded-[22px] bg-panel p-1 ring-1 ring-line">
            <Chip on={area === 'all'} onClick={() => setArea('all')} count={LIBRARY.filter(d => match(d, 'all', type)).length}>All areas</Chip>
            {AREA_ORDER.map(a => (
              <Chip key={a} on={area === a} onClick={() => setArea(a)} count={LIBRARY.filter(d => match(d, a, type)).length}>{AREAS[a].label.replace(' and alternatives', '')}</Chip>
            ))}
          </div>
        </LayoutGroup>
        <LayoutGroup id="lib-type">
          <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-1 self-start rounded-[22px] bg-panel p-1 ring-1 ring-line">
            <Chip on={type === 'all'} onClick={() => setType('all')} count={LIBRARY.filter(d => match(d, area, 'all')).length}>All</Chip>
            <Chip on={type === 'Investment memo'} onClick={() => setType('Investment memo')} count={LIBRARY.filter(d => match(d, area, 'Investment memo')).length}>Memos</Chip>
            <Chip on={type === 'Practitioner note'} onClick={() => setType('Practitioner note')} count={LIBRARY.filter(d => match(d, area, 'Practitioner note')).length}>Notes</Chip>
          </div>
        </LayoutGroup>
      </div>

      <p className="sr-only" aria-live="polite">{shown.length} documents shown</p>
      <div className="mt-8 grid gap-6">
        <AnimatePresence initial={false} mode="popLayout">
          {groups.map(g => (
            <motion.section key={g.a} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}
              className="surface px-5 sm:px-8" aria-labelledby={`lib-${g.a}`}>
              <div className="flex items-baseline justify-between gap-4 border-b border-line py-4">
                <h3 id={`lib-${g.a}`} className="text-[13px] font-medium text-ink">{AREAS[g.a].label}</h3>
                <span className="num font-mono text-[11px] text-faint">{g.items.length}</span>
              </div>
              <ul>
                <AnimatePresence initial={false}>
                  {g.items.map(d => <Row key={d.href} d={d} />)}
                </AnimatePresence>
              </ul>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
