import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Arrow } from '@/components/ui';
import { ARCH, OPS, type ArchPart } from '@/data/lab';

const ALL: ArchPart[] = [...ARCH.flatMap(l => l.parts), ...OPS];

function Detail({ part }: { part: ArchPart }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={part.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .22, ease: [.25, 1, .5, 1] }}>
        <div className="text-[1.15rem] font-semibold tracking-tight text-ink">{part.label}</div>
        {part.sub && <div className="mt-1 font-mono text-[11.5px] text-faint">{part.sub}</div>}
        <div className="mt-5 font-mono text-[11px] uppercase tracking-[.12em] text-teal">What it does</div>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{part.does}</p>
        <div className="mt-5 font-mono text-[11px] uppercase tracking-[.12em] text-sand-ink">What it guards against</div>
        <p className="mt-2 flex gap-2.5 text-[14.5px] leading-relaxed text-ink">
          <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 text-sand" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="M8 1.5 2.5 3.5v4c0 3.2 2.3 5.9 5.5 7 3.2-1.1 5.5-3.8 5.5-7v-4L8 1.5z" /></svg>
          {part.guards}
        </p>
        {part.seen && (
          <a href={part.seen.href} className="group mt-6 inline-flex items-center gap-2 text-[13.5px] text-teal no-underline">
            <span className="link">{part.seen.text}</span> <Arrow />
          </a>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function PartBtn({ part, on, onSelect, className = '' }: { part: ArchPart; on: boolean; onSelect: (id: string) => void; className?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={() => onSelect(part.id)} onFocus={() => onSelect(part.id)}
      className={`group relative min-h-[52px] min-w-0 rounded-xl px-3.5 py-2.5 text-left ring-1 ring-inset transition-[box-shadow,background-color,transform] duration-200 hover:-translate-y-px ${
        on ? 'bg-[color-mix(in_srgb,var(--c-green)_11%,var(--c-card))] ring-teal' : part.id === 'approval' ? 'bg-card ring-[color-mix(in_srgb,var(--c-gold)_50%,transparent)] hover:ring-sand' : 'bg-card ring-line-strong hover:ring-teal'} ${className}`}>
      <span className="block text-[13.5px] font-medium leading-tight text-ink">{part.label}</span>
      {part.sub && <span className="mt-1 block font-mono text-[10.5px] leading-snug text-faint">{part.sub}</span>}
    </button>
  );
}

/* A layered reference architecture for agentic systems. Selecting or focusing a component explains its job and
   the failure it guards against. */
export function ArchExplorer() {
  const [sel, setSel] = useState('approval');
  const part = ALL.find(p => p.id === sel)!;
  const inOps = OPS.some(p => p.id === sel);

  const inline = (show: boolean) => (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div key="inline" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          transition={{ duration: .3, ease: [.25, 1, .5, 1] }} className="overflow-hidden lg:hidden">
          <div className="mt-3 rounded-xl border border-line bg-card p-4" aria-live="polite"><Detail part={part} /></div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
      <div className="surface dot-bg relative p-4 sm:p-6">
        <ol className="grid gap-2" aria-label="Layers, from the people who use the system down to data and models">
          {ARCH.map((layer, li) => (
            <li key={layer.id}>
              <div className="rounded-2xl border border-line bg-[color-mix(in_srgb,var(--c-panel)_70%,transparent)] p-2.5 sm:p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">{layer.label}</span>
                  <span className="num font-mono text-[10.5px] text-faint">L{li + 1}</span>
                </div>
                <div className={`grid gap-2 ${layer.parts.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : layer.parts.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                  {layer.parts.map(p => <PartBtn key={p.id} part={p} on={sel === p.id} onSelect={setSel} />)}
                </div>
                {inline(layer.parts.some(p => p.id === sel))}
              </div>
              {li < ARCH.length - 1 && (
                <div className="flex justify-center py-0.5" aria-hidden="true">
                  <svg viewBox="0 0 10 14" className="h-3.5 w-2.5 text-line-strong" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M5 0v12M1.5 8.5 5 12l3.5-3.5" /></svg>
                </div>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-4 rounded-2xl border border-dashed border-line-strong p-2.5 sm:p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">Operations</span>
            <span className="font-mono text-[10.5px] text-faint">alongside every layer</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {OPS.map(p => <PartBtn key={p.id} part={p} on={sel === p.id} onSelect={setSel} />)}
          </div>
          {inline(inOps)}
        </div>
      </div>

      <aside className="surface hidden self-start p-7 lg:sticky lg:top-24 lg:block" aria-live="polite" aria-label="Selected component">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">Selected component</span>
          <span className="font-mono text-[11px] text-faint">{ALL.findIndex(p => p.id === sel) + 1} / {ALL.length}</span>
        </div>
        <Detail part={part} />
      </aside>
    </div>
  );
}
