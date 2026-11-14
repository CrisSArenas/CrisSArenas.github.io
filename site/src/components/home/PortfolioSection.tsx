import { motion } from 'motion/react';
import { SectionHead, Arrow, Tag, staggerParent, staggerItem } from '@/components/ui';
import { bySlug } from '@/data/projects';
import { PM_STEPS, ASSET_CLASSES } from '@/data/home';

export function PortfolioSection() {
  return (
    <section id="portfolio" aria-labelledby="portfolio-h" className="py-20 sm:py-28">
      <div className="wrap">
        <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-10">
          <SectionHead id="portfolio-h" eyebrow="Portfolio management" title="How I run a multi-asset portfolio"
            intro="I've managed multi-asset portfolios reporting directly to the CIO, as part of a team of portfolio managers focused on allocation across public and private markets. Each step below links to a working application that shows it." />
          <div className="mb-12 lg:pb-1">
            <div className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">Asset classes covered</div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {ASSET_CLASSES.map(a => <li key={a}><Tag>{a}</Tag></li>)}
            </ul>
          </div>
        </div>

        <motion.ol variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          className="grid overflow-hidden rounded-[20px] border border-line bg-line [gap:1px] sm:grid-cols-2 lg:grid-cols-3">
          {PM_STEPS.map(s => {
            const p = 'slug' in s ? bySlug(s.slug) : undefined;
            const href = p ? p.href : 'href' in s ? s.href : '#';
            const label = p ? p.title : 'label' in s ? s.label : '';
            return (
              <motion.li key={s.n} variants={staggerItem} className="bg-card">
                <a href={href} className="step-cell group flex h-full flex-col gap-4 p-6 no-underline sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="num font-mono text-[12px] text-teal">{s.n}</span>
                    <span className="h-px flex-1 mx-4 bg-line" aria-hidden="true" />
                    <span className="font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">Step</span>
                  </div>
                  <h3 className="text-[19px] font-semibold tracking-[-.015em] text-ink">{s.title}</h3>
                  <p className="text-[14.5px] leading-relaxed text-muted">{s.text}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[13.5px] text-teal">See it in {label}<Arrow /></span>
                </a>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}
