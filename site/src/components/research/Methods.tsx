import { motion } from 'motion/react';
import { Arrow, staggerItem, staggerParent } from '@/components/ui';
import { METHODOLOGY } from '@/data/research';
import { bySlug } from '@/data/projects';

/* The quantitative methods used across the site, each linked to the application that runs it. */
export function Methods() {
  return (
    <motion.ul variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      className="grid overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 1 }}>
      {METHODOLOGY.map((m, i) => {
        const app = bySlug(m.app);
        return (
          <motion.li key={m.name} variants={staggerItem} className="bg-card">
            <a href={app?.href} className="group flex h-full flex-col p-6 no-underline transition-colors duration-300 hover:bg-panel sm:p-7">
              <span className="num font-mono text-[11px] text-faint">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-3 text-[1.08rem] font-semibold tracking-tight text-ink">{m.name}</h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{m.plain}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[13px] text-teal">
                <span className="text-faint">Runs in</span> {app?.title} <Arrow />
              </span>
            </a>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
