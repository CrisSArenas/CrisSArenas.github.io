import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SectionHead, Arrow, Disclosure, Button, Reveal } from '@/components/ui';
import { AI_LAYERS } from '@/data/home';
import { bySlug } from '@/data/projects';

const NOTE: Record<string, string> = { orch: 'orchestrator → workers', tools: 'retrieval · access filter · guard', verify: 'verifier · approval gate', eval: 'test suite · traces' };

export function AiSection() {
  const [sel, setSel] = useState(0);
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const L = AI_LAYERS[sel];
  const lab = bySlug('ai-engineering-lab'), mon = bySlug('agentic-portfolio-monitor');

  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (sel + d + AI_LAYERS.length) % AI_LAYERS.length;
    setSel(n); refs.current[n]?.focus();
  };

  return (
    <section id="ai" aria-labelledby="ai-h" className="relative py-20 sm:py-28">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-line" />
      <div className="wrap">
        <SectionHead id="ai-h" eyebrow="AI engineering" title="How the agentic systems are built"
          intro="Four layers, from the agent that plans the work down to the tests that catch regressions. Pick a layer for the plain version; the technical detail sits one click further." />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
          <Reveal>
            <div role="tablist" aria-label="Layers of an agentic system" aria-orientation="vertical" onKeyDown={onKey} className="relative flex flex-col gap-2.5">
              <span aria-hidden="true" className="absolute bottom-6 left-[27px] top-6 w-px bg-line-strong" />
              {AI_LAYERS.map((l, i) => {
                const on = i === sel;
                return (
                  <button key={l.id} ref={el => { refs.current[i] = el; }} role="tab" type="button" id={`${uid}-t${i}`} aria-selected={on} aria-controls={`${uid}-p`} tabIndex={on ? 0 : -1}
                    onClick={() => setSel(i)}
                    className={`group relative flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-[border-color,background-color,transform] duration-300 sm:px-5 ${on ? 'border-teal/50 bg-card shadow-[inset_3px_0_0_var(--c-green)]' : 'border-line bg-panel/50 hover:border-line-strong hover:bg-card'}`}>
                    <span className={`relative z-10 grid size-[22px] shrink-0 place-items-center rounded-full border font-mono text-[10px] transition-colors ${on ? 'border-teal bg-teal text-page' : 'border-line-strong bg-card text-faint'}`}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[15.5px] font-medium tracking-[-.01em] ${on ? 'text-ink' : 'text-muted group-hover:text-ink'}`}>{l.title}</span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-faint">{NOTE[l.id]}</span>
                    </span>
                    <Arrow className={`shrink-0 ${on ? 'text-teal' : 'text-faint'}`} />
                  </button>
                );
              })}
            </div>
          </Reveal>

          <Reveal delay={.08}>
            <div id={`${uid}-p`} role="tabpanel" aria-labelledby={`${uid}-t${sel}`} className="surface relative min-h-[360px] overflow-hidden p-6 sm:p-8">
              <div aria-hidden="true" className="grid-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom_left,#000,transparent_55%)]" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={L.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .3, ease: [.25, 1, .5, 1] }} className="relative">
                  <div className="eyebrow">Layer {L.n}</div>
                  <h3 className="mt-3 text-[clamp(1.4rem,2.4vw,1.75rem)] font-semibold leading-tight tracking-[-.02em] text-ink">{L.title}</h3>
                  <p className="mt-4 text-[16px] leading-relaxed text-muted">{L.plain}</p>
                  <div className="mt-6">
                    <Disclosure title="Technical detail">
                      <ul className="space-y-2.5 text-[14px] leading-relaxed text-muted">
                        {L.tech.map(t => <li key={t} className="flex gap-3"><span className="mt-[9px] size-1 shrink-0 rounded-full bg-teal" aria-hidden="true" />{t}</li>)}
                      </ul>
                    </Disclosure>
                  </div>
                  <a href={bySlug(L.see)?.href} className="group mt-6 inline-block text-[14px] text-teal no-underline">See it in {bySlug(L.see)?.title}<Arrow className="ml-1.5 inline-block align-[-2px]" /></a>
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-10 flex flex-col gap-5 border-t border-line pt-8 xl:flex-row xl:items-center xl:justify-between">
          <p className="max-w-[26rem] text-[14px] leading-relaxed text-muted">
            The public demos are deterministic simulations with no language model calls; the retrieval, permission checks, approval gates and scoring in them are real code.
          </p>
          <div className="flex flex-wrap gap-2.5 xl:shrink-0">
            <Button href={lab!.href} variant="outline" size="sm">{lab!.title}</Button>
            <Button href={mon!.href} variant="outline" size="sm">{mon!.title}</Button>
            <Button href="/ai-systems.html" variant="ghost" size="sm" className="group">AI systems deep dive <Arrow /></Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
