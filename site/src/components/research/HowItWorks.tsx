import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Disclosure, Reveal, Tabs } from '@/components/ui';
import { CONFIG } from '@/data/research';

/* ---------- 1. What a market regime is ---------- */

const REGIMES = [
  { id: 0, name: 'Growth', color: 'var(--c-green)' },
  { id: 1, name: 'Contraction', color: 'var(--c-gold)' },
  { id: 2, name: 'Crisis', color: 'var(--c-negative)' }
];
/* month-to-month persistence of each regime in two of the paper's processes */
const PERSIST = { base: [0.92, 0.82, 0.65], persistent: [0.97, 0.92, 0.85] } as const;
type PKey = keyof typeof PERSIST;

/* months of each regime in the 120-month test period of the base process, from the paper */
const TEST_MONTHS = [85, 30, 5];

function RegimeSpells() {
  const [k, setK] = useState<PKey>('base');
  const dur = PERSIST[k].map(p => 1 / (1 - p));
  const max = 1 / (1 - PERSIST.persistent[0]);
  return (
    <div className="surface-2 p-5 sm:p-6">
      <div className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">The test decade, base process</div>
      <div className="mt-4 flex h-10 w-full gap-[3px] overflow-hidden rounded-lg" role="img"
        aria-label="Of the 120 test months, 85 were growth, 30 contraction and 5 crisis">
        {REGIMES.map((g, i) => (
          <div key={g.id} className="flex items-center px-2.5" style={{ width: `${(TEST_MONTHS[i] / 120) * 100}%`, background: g.color }}>
            {TEST_MONTHS[i] > 10 && <span className="font-mono text-[11px] text-[var(--c-page)]">{TEST_MONTHS[i]} mo</span>}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12.5px] text-faint">85 growth months, 30 contraction and 5 crisis. Five crisis months are too few to learn or judge a crisis strategy, which the paper notes.</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <div className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">Average length of a spell</div>
        <Tabs label="Regime persistence" value={k} onChange={setK} tabs={[{ id: 'base', label: 'Base' }, { id: 'persistent', label: 'Persistent' }]} />
      </div>
      <ul className="mt-4 grid gap-3">
        {REGIMES.map((g, i) => (
          <li key={g.id} className="grid grid-cols-[92px_1fr_64px] items-center gap-3">
            <span className="flex items-center gap-2 text-[13px] text-ink"><span className="size-2.5 shrink-0 rounded-sm" style={{ background: g.color }} />{g.name}</span>
            <span className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--c-text)_7%,transparent)]">
              <motion.span className="block h-full rounded-full" style={{ background: g.color }} initial={false}
                animate={{ width: `${(dur[i] / max) * 100}%` }} transition={{ duration: .6, ease: [.25, 1, .5, 1] }} />
            </span>
            <span className="num text-right font-mono text-[12px] text-muted">{dur[i].toFixed(1)} mo</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12.5px] leading-relaxed text-faint">From the chance that a regime carries on into next month ({PERSIST[k].join(', ')}): a spell lasts 1 ÷ (1 − that chance) months on average.</p>
    </div>
  );
}

/* ---------- 2. Two stages against one model ---------- */

const CARD_STEPS: { id: string; label: string; sub: string; body: string }[] = [
  { id: 'in', label: 'Input window', sub: '12 months × 22 signals', body: 'Each month the model looks back 12 months at 22 signals: 10 asset returns, 8 macro indicators and 4 stress indicators. Each is standardized with only the history available at that time, so nothing from the future leaks in.' },
  { id: 'enc', label: 'Encoder', sub: 'transformer, 2 layers', body: 'A small transformer reads the window and writes a summary of each month in the context of the others.' },
  { id: 'card', label: 'Regime discovery', sub: '3 learned queries', body: 'Three learned “regime questions” each look across the 12 months and decide which months matter to them. Each produces a description of the market and a probability that its regime is in force. Nothing tells them what the regimes should be; they learn whatever helps the portfolio. The attention weights show which months drove each regime.' },
  { id: 'heads', label: 'Allocation heads', sub: 'one per regime', body: 'Each regime has its own small allocation head that turns its description into weights for the 10 assets, kept between 2% and 25% each.' },
  { id: 'blend', label: 'Blend', sub: 'weighted by probability', body: 'The final portfolio mixes the three regime portfolios by their probabilities. When the model is sure of the regime, one head dominates; when it is unsure, the portfolio moves smoothly between them instead of jumping.' },
  { id: 'loss', label: 'One objective', sub: 'risk-adjusted return', body: 'The whole model is trained against one goal, the portfolio’s Sharpe ratio, with small penalties for vague regimes and concentrated weights. No step is ever scored on how well it labels regimes.' }
];

function Box({ children, active, onClick, tone = 'default' }: { children: ReactNode; active?: boolean; onClick?: () => void; tone?: 'default' | 'warn' }) {
  const cls = `relative flex min-h-[64px] min-w-0 flex-1 flex-col justify-center rounded-xl px-3.5 py-3 text-left ring-1 ring-inset transition-[box-shadow,background-color] duration-200 ${
    active ? 'bg-[color-mix(in_srgb,var(--c-green)_10%,var(--c-card))] ring-teal' : tone === 'warn' ? 'bg-card ring-[color-mix(in_srgb,var(--c-gold)_45%,transparent)]' : 'bg-card ring-line-strong'}`;
  if (!onClick) return <div className={cls}>{children}</div>;
  return <button type="button" aria-pressed={active} onClick={onClick} className={`${cls} hover:ring-teal`}>{children}</button>;
}
const Chevron = () => (
  <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 rotate-90 self-center text-faint md:rotate-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);

function Pipelines() {
  const [sel, setSel] = useState('card');
  const step = CARD_STEPS.find(s => s.id === sel)!;
  return (
    <div className="grid gap-4">
      <div className="surface-2 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">The usual way · two stages</div>
          <div className="text-[12.5px] text-faint">GMM-MVO in the chart</div>
        </div>
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-stretch">
          <Box><span className="text-[13.5px] font-medium text-ink">Market data</span></Box><Chevron />
          <Box><span className="text-[13.5px] font-medium text-ink">Classify the regime</span><span className="text-[12px] text-faint">mixture model</span></Box><Chevron />
          <Box tone="warn"><span className="font-mono text-[12.5px] text-sand-ink">label = “growth”</span><span className="text-[12px] text-faint">uncertainty discarded</span></Box><Chevron />
          <Box><span className="text-[13.5px] font-medium text-ink">Optimize for that regime</span><span className="text-[12px] text-faint">mean-variance</span></Box>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-muted">A wrong label passes straight into the portfolio, and the classifier is graded on labelling, which is a different goal from the portfolio’s.</p>
      </div>

      <div className="surface-2 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-mono text-[11px] uppercase tracking-[.12em] text-teal">The paper’s model · RAT-CARD</div>
          <div className="text-[12.5px] text-faint">Select a step</div>
        </div>
        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {CARD_STEPS.map((s, i) => (
            <li key={s.id} className="flex min-w-0">
              <Box active={sel === s.id} onClick={() => setSel(s.id)}>
                <span className="num font-mono text-[10.5px] text-faint">{i + 1}</span>
                <span className="mt-1 text-[13.5px] font-medium leading-tight text-ink">{s.label}</span>
                <span className="mt-0.5 text-[12px] leading-snug text-faint">{s.sub}</span>
              </Box>
            </li>
          ))}
        </ol>
        <div className="mt-4 min-h-[96px] rounded-xl border border-line bg-card px-4 py-4" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .22 }}>
              <div className="text-[13.5px] font-semibold text-ink">{step.label}</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{step.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. How the comparison was run ---------- */

function Protocol() {
  const segs = [
    { label: 'Train', months: 480, range: 'months 1-480', cls: 'bg-[color-mix(in_srgb,var(--c-text)_14%,transparent)]' },
    { label: 'Tune', months: 120, range: '481-600', cls: 'bg-[color-mix(in_srgb,var(--c-gold)_45%,transparent)]' },
    { label: 'Test', months: 120, range: '601-720', cls: 'bg-teal' }
  ];
  const facts = [
    { v: '3', l: 'synthetic markets with known regimes', d: 'Base, persistent and low signal-to-noise' },
    { v: '3', l: 'random seeds per model', d: 'Seeds 42, 123 and 7, reported as mean and spread' },
    { v: '9 + 1', l: 'methods, plus an oracle', d: 'The oracle is handed the true regimes, as a ceiling' },
    { v: '10,000', l: 'bootstrap resamples', d: 'To test whether a gap in Sharpe ratio is real' }
  ];
  return (
    <div className="surface-2 p-5 sm:p-6">
      <div className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">720 simulated months, used in time order</div>
      <div className="mt-4 flex h-11 w-full gap-[3px] overflow-hidden rounded-lg" role="img" aria-label="480 months to train, 120 to tune, 120 to test">
        {segs.map((s, i) => (
          <motion.div key={s.label} className={`${s.cls} flex items-center px-3`} style={{ width: `${(s.months / 720) * 100}%`, transformOrigin: 'left' }}
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: .8, delay: i * .15, ease: [.25, 1, .5, 1] }}>
            <span className={`font-mono text-[11px] ${s.label === 'Test' ? 'text-[var(--c-page)]' : 'text-ink'}`}>{s.label}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-2 flex text-[11.5px] text-faint">
        {segs.map(s => <span key={s.label} className="num font-mono" style={{ width: `${(s.months / 720) * 100}%` }}>{s.range}</span>)}
      </div>
      <p className="mt-4 text-[13.5px] leading-relaxed text-muted">Every model learns on the first 40 years, is tuned on the next 10 and is scored only on the last 10, which it has never seen. Because the markets are simulated, the true regimes are known, so the study can check whether a model really finds them.</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line pt-5 lg:grid-cols-4">
        {facts.map(f => (
          <div key={f.l} className="flex flex-col">
            <dt className="text-[12.5px] leading-snug text-muted">{f.l}</dt>
            <dd className="num order-first font-mono text-[1.35rem] font-semibold text-ink">{f.v}</dd>
            <dd className="mt-1 text-[12px] leading-snug text-faint">{f.d}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function HowItWorks() {
  return (
    <div className="grid gap-14">
      <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div>
          <div className="font-mono text-[12px] text-teal">01</div>
          <h3 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-ink">What a market regime is</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">Markets go through spells that behave differently: steady growth, contraction, and short crises when assets fall together. A regime is one of those spells. The same portfolio can be right in one and wrong in the next, so knowing which regime you are in, and how sure you are, matters for allocation.</p>
        </div>
        <RegimeSpells />
      </Reveal>

      <Reveal className="grid gap-8">
        <div className="max-w-2xl">
          <div className="font-mono text-[12px] text-teal">02</div>
          <h3 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-ink">Finding regimes and allocating in one model</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">The usual approach labels the regime first, then optimizes for it. The paper’s model does both at once: a regime-discovery step built on cross-attention feeds one allocation head per regime, and the whole thing is trained only on how good the resulting portfolio is.</p>
        </div>
        <Pipelines />
      </Reveal>

      <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div>
          <div className="font-mono text-[12px] text-teal">03</div>
          <h3 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-ink">How the comparison was run</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">Every method was trained and tested the same way, out of sample and in time order, on simulated markets whose regimes are known. Each model ran with three random seeds, and the spread across seeds is shown wherever a result is.</p>
        </div>
        <Protocol />
      </Reveal>

      <Reveal className="grid gap-3">
        <Disclosure title="Model configuration" hint="Exact settings used in the experiments">
          <dl className="grid gap-x-8 gap-y-3 text-[13.5px] sm:grid-cols-[180px_1fr]">
            {CONFIG.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-mono text-[12px] uppercase tracking-[.08em] text-faint sm:pt-0.5">{k}</dt>
                <dd className="mb-2 text-muted sm:mb-0">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[13.5px] leading-relaxed text-muted">The regime queries are initialized orthogonally so they start out looking for different things. Each attends over the encoder’s hidden states by scaled dot-product cross-attention, producing a regime context vector and, through a scoring network and softmax, a soft regime probability. In the limit of one-hot probabilities the model reduces to three independent single-regime allocators.</p>
        </Disclosure>
        <Disclosure title="How significance was tested" hint="Circular block bootstrap">
          <div className="prose-site text-[14px]">
            <p>Differences in Sharpe ratio between RAT-CARD and each alternative were tested with a circular block bootstrap (blocks of 6 months, 10,000 replications) on the base process, which respects the serial dependence in monthly returns.</p>
            <p>Every comparison between neural models produces a wide interval that straddles zero. The only interval that excludes zero is RAT-CARD against hierarchical risk parity: a difference of 0.42, with an interval of 0.01 to 0.82. With 120 test months the study does not have the power to separate these architectures, and the paper says so.</p>
          </div>
        </Disclosure>
        <Disclosure title="The regime paradox" hint="Better labels, worse portfolios">
          <div className="prose-site text-[14px]">
            <p>The mixture model recovers the true regimes far better than CARD (adjusted Rand index 0.59 against 0.03) and still builds the worse portfolio (Sharpe ratio 0.44 against 0.82). The allocation that maximizes risk-adjusted return need not line up with the labels that generated the data, and the two-stage approach adds estimation error in its optimization step.</p>
            <p>The two-stage pipeline also trades about twice as much as RAT-CARD: mean turnover of 0.21 of portfolio value per rebalance, against 0.10.</p>
          </div>
        </Disclosure>
        <Disclosure title="Limitations the paper states" hint="Read these before the results">
          <ul className="grid gap-2 text-[14px] leading-relaxed text-muted">
            {[
              'Synthetic data only. Real regimes may not be discrete and transitions may not be Markov.',
              'Three settings of one generating structure. Other regime counts or non-Gaussian returns could change the conclusions.',
              'No real-market validation. Nothing here is evidence of real-world portfolio performance.',
              '120 test months and three seeds give limited statistical power, which the wide intervals show.',
              'Transaction costs are measured but never enter the training objective.'
            ].map(t => <li key={t} className="flex gap-3"><span className="mt-2 size-1 shrink-0 rounded-full bg-sand" aria-hidden="true" />{t}</li>)}
          </ul>
        </Disclosure>
      </Reveal>
    </div>
  );
}
