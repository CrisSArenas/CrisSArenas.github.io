import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Tabs } from '@/components/ui';
import { NAME, TITLE, HERO_LINE, EMAIL, LINKEDIN } from '@/data/site';
import { FrontierPanel } from './FrontierPanel';
import { AgentsPanel } from './AgentsPanel';

const ease = [.25, 1, .5, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: .7, delay, ease } });

export function MailIcon({ className = 'size-[18px]' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" /></svg>;
}
export function LinkedInIcon({ className = 'size-[17px]' }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-4z" /></svg>;
}

type PanelTab = 'portfolio' | 'agents';

export function Hero() {
  const [tab, setTab] = useState<PanelTab>('portfolio');
  return (
    <section aria-labelledby="hero-name" className="relative overflow-hidden pb-12 pt-24 sm:pt-28 lg:pb-16 lg:pt-32">
      <div aria-hidden="true" className="home-hero-wash pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="grid-bg home-hero-grid pointer-events-none absolute inset-0" />
      <div className="wrap relative grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="max-w-xl">
          <motion.div {...rise(0)} className="eyebrow mb-6 flex items-center gap-3 max-sm:text-[10.5px] max-sm:tracking-[.1em]">
            <span className="hidden h-px w-8 bg-teal/60 sm:block" aria-hidden="true" />Multi-asset portfolios · Agentic AI systems
          </motion.div>
          <motion.h1 id="hero-name" {...rise(.06)} className="display text-[clamp(2.9rem,7vw,4.9rem)] text-ink">{NAME}</motion.h1>
          <motion.p {...rise(.12)} className="mt-5 text-[clamp(1.08rem,1.6vw,1.3rem)] font-medium leading-snug tracking-[-.01em] text-ink/90 [text-wrap:balance]">{TITLE}</motion.p>
          <motion.p {...rise(.18)} className="lede mt-5 max-w-[34rem]">{HERO_LINE}</motion.p>
          <motion.div {...rise(.26)} className="mt-9 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
            <Button href="#portfolio" variant="primary">Portfolio management</Button>
            <Button href="#ai" variant="sand">AI engineering</Button>
            <Button href="#work" variant="outline">Selected work</Button>
          </motion.div>
          <motion.div {...rise(.34)} className="mt-7 flex items-center gap-1 text-muted">
            <a href={`mailto:${EMAIL}`} aria-label={`Email ${NAME}`} className="grid size-10 place-items-center rounded-full transition-colors hover:bg-panel hover:text-ink"><MailIcon /></a>
            <a href={LINKEDIN} target="_blank" rel="noopener" aria-label={`${NAME} on LinkedIn (opens in a new tab)`} className="grid size-10 place-items-center rounded-full transition-colors hover:bg-panel hover:text-ink"><LinkedInIcon /></a>
            <span className="ml-2 hidden h-4 w-px bg-line-strong sm:block" aria-hidden="true" />
            <span className="ml-3 hidden font-mono sm:inline text-[11px] uppercase tracking-[.12em] text-faint">Working applications below run in your browser</span>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .2, ease }}
          className="surface relative min-w-0 p-4 shadow-[0_30px_80px_-40px_var(--c-shade-2)] sm:p-6">
          <div aria-hidden="true" className="dot-bg pointer-events-none absolute inset-0 rounded-[20px] opacity-50 [mask-image:linear-gradient(to_bottom,#000,transparent_45%)]" />
          <div className="relative">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Tabs<PanelTab> label="Visualization" value={tab} onChange={setTab}
                tabs={[{ id: 'portfolio', label: 'Portfolio' }, { id: 'agents', label: 'Agents' }]} />
              <span className="font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">
                {tab === 'portfolio' ? 'Efficient frontier · live' : 'Agent workflow · scripted'}
              </span>
            </div>
            <div className="min-h-[650px] sm:min-h-[700px]" role="tabpanel" aria-label={tab === 'portfolio' ? 'Portfolio' : 'Agents'}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .28, ease }}>
                  {tab === 'portfolio' ? <FrontierPanel /> : <AgentsPanel />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
