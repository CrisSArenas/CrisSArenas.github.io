import { motion } from 'motion/react';
import { mount } from '@/lib/mount';
import { PAPER } from '@/data/site';
import { Button, Arrow, KindBadge, Reveal, SectionHead, staggerItem, staggerParent } from '@/components/ui';
import { KEY_NUMBERS } from '@/data/research';
import { SharpeChart } from '@/components/research/SharpeChart';
import { HowItWorks } from '@/components/research/HowItWorks';
import { Methods } from '@/components/research/Methods';
import { Library } from '@/components/research/Library';

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line" aria-labelledby="paper-title">
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_30%_20%,black,transparent_70%)]" aria-hidden="true" />
      <motion.div variants={staggerParent} initial="hidden" animate="show" className="wrap relative grid gap-12 pb-20 pt-32 sm:pt-40 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-16 lg:pb-28">
        <div>
          <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="eyebrow">Research</span>
            <KindBadge kind="Published paper" />
            <span className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">SSRN · 2026</span>
          </motion.div>
          <motion.h1 variants={staggerItem} id="paper-title" className="display mt-6 max-w-[24ch] text-[clamp(1.9rem,3.7vw,3.1rem)] text-ink">{PAPER.title}</motion.h1>
          <motion.p variants={staggerItem} className="mt-5 text-[14px] text-faint">Cristian Miguel Sanchez Arenas · Independent researcher · 26 pages</motion.p>

          <motion.div variants={staggerItem} className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[.14em] text-faint">The question</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-ink">Can one model learn to recognize market regimes and build the portfolio at the same time, and does that beat the usual two steps of labelling the regime first and optimizing for it second?</p>
            </div>
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[.14em] text-faint">What it found</h2>
              <p className="mt-3 text-[16px] leading-relaxed text-muted">On simulated markets that switch between regimes, the neural models generally beat the traditional allocation rules, mostly by taking less risk. A plain LSTM did as well as the paper’s own transformer, and the differences between the neural models are not statistically significant.</p>
            </div>
          </motion.div>

          <motion.div variants={staggerItem} className="mt-10 flex flex-wrap gap-3">
            <Button href={PAPER.summary} className="group">Interactive summary <Arrow /></Button>
            <Button href={PAPER.ssrn} variant="outline" external>Read on SSRN</Button>
            <Button href={PAPER.pdf} variant="ghost" external>
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10" /></svg>
              PDF
            </Button>
          </motion.div>
        </div>

        <motion.aside variants={staggerItem} className="surface self-end p-6 sm:p-8" aria-label="Key numbers from the paper">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">In numbers</span>
            <span className="font-mono text-[11px] text-faint">base process</span>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-7">
            {KEY_NUMBERS.map((k, i) => (
              <div key={k.label} className={i === 2 ? 'col-span-2 border-t border-line pt-6' : i === 3 ? 'col-span-2' : ''}>
                <dd className="num text-[clamp(1.6rem,2.6vw,2.1rem)] font-semibold tracking-tight text-ink">{k.value}</dd>
                <dt className="mt-1 text-[13px] leading-snug text-muted">{k.label}</dt>
              </div>
            ))}
          </dl>
          <p className="mt-7 border-t border-line pt-5 text-[12.5px] leading-relaxed text-faint">A controlled study on synthetic data. The paper states that its results are not evidence of real-world performance.</p>
        </motion.aside>
      </motion.div>
    </section>
  );
}

function Page() {
  return (
    <>
      <Hero />

      <section className="wrap py-24 sm:py-32" aria-labelledby="results">
        <SectionHead id="results" eyebrow="Results" title="Better than the baselines, no clear winner among the neural models"
          intro="Switch between the three simulated markets. The ordering holds up, but the spread across seeds is wide enough that the neural models cannot be told apart." />
        <Reveal><SharpeChart /></Reveal>
      </section>

      <section className="border-y border-line bg-tint" aria-labelledby="how">
        <div className="wrap py-24 sm:py-32">
          <SectionHead id="how" eyebrow="How it works" title="What the model does, and how it was tested"
            intro="The idea in three pictures. The technical settings are in the panels underneath." />
          <HowItWorks />
        </div>
      </section>

      <section className="wrap py-24 sm:py-32" aria-labelledby="methods">
        <SectionHead id="methods" eyebrow="Methodology" title="The methods behind the applications"
          intro="The same standards run through the working applications on this site. Each method below links to the application that implements it." />
        <Methods />
      </section>

      <section className="border-t border-line" aria-labelledby="writing">
        <div className="wrap py-24 sm:py-32">
          <SectionHead id="writing" eyebrow="Writing" title="Investment memos and practitioner notes"
            intro="Memos read like committee papers; notes are short pieces on one problem. All of them are written from the base cases of the applications on this site, which run on synthetic data with fictional funds and companies." />
          <Library />
        </div>
      </section>
    </>
  );
}
mount(<Page />);
