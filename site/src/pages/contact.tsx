import { motion } from 'motion/react';
import { mount } from '@/lib/mount';
import { Reveal, Arrow } from '@/components/ui';
import { EMAIL, LINKEDIN } from '@/data/site';
import { CopyEmail } from '@/components/about/CopyEmail';
import '@/components/about/about.css';

const ease = [.25, 1, .5, 1] as const;

function MailIcon() {
  return <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>;
}
function LinkedInIcon() {
  return <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><path d="M6.94 8.5H3.56V20h3.38V8.5zM5.25 3.5a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92zM20.44 13.4c0-3.1-1.65-4.55-3.86-4.55-1.78 0-2.58.98-3.02 1.67V8.5h-3.37V20h3.37v-6.07c0-1.6.3-3.15 2.29-3.15 1.96 0 1.99 1.83 1.99 3.25V20h3.38z" /></svg>;
}

function Page() {
  const handle = LINKEDIN.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return (
    <section className="relative overflow-hidden" aria-labelledby="contact-h">
      <div className="dot-bg contact-dots pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="wrap pt-32 md:pt-44">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease }}>
            <div className="eyebrow mb-6">Contact</div>
            <h1 id="contact-h" className="display text-[clamp(2.6rem,6.4vw,5rem)] text-ink">Get in touch</h1>
            <p className="lede mt-6 max-w-[34ch]">I am happy to talk about portfolio management, quantitative research and AI engineering.</p>
          </motion.div>

          <div className="space-y-4 lg:pt-16">
            <Reveal>
              <div className="surface p-6 sm:p-8">
                <div className="flex items-center gap-3 text-muted">
                  <span className="grid size-10 place-items-center rounded-full bg-panel text-teal ring-1 ring-line"><MailIcon /></span>
                  <h2 className="font-mono text-[11px] uppercase tracking-[.14em] text-faint">Email</h2>
                </div>
                <a href={`mailto:${EMAIL}`} className="mt-6 block break-all text-[clamp(1.15rem,2.6vw,1.6rem)] font-medium tracking-[-.01em] text-ink no-underline transition-colors hover:text-teal">
                  {EMAIL}
                </a>
                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <CopyEmail email={EMAIL} />
                  <motion.a href={`mailto:${EMAIL}`} whileTap={{ scale: .97 }}
                    className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-btn max-sm:w-full px-5 text-[14.5px] font-medium text-btn-ink no-underline transition-shadow hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--c-btn)_18%,transparent)]">
                    Write an email <Arrow />
                  </motion.a>
                </div>
              </div>
            </Reveal>
            <Reveal delay={.08}>
              <a href={LINKEDIN} target="_blank" rel="noopener" className="surface lift group flex items-center gap-4 p-6 no-underline sm:p-8">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-panel text-teal ring-1 ring-line"><LinkedInIcon /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[11px] uppercase tracking-[.14em] text-faint">LinkedIn</span>
                  <span className="mt-1.5 block text-[15px] text-ink [overflow-wrap:anywhere]">{handle}</span>
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full text-muted ring-1 ring-line-strong transition-colors duration-300 group-hover:text-teal group-hover:ring-teal">
                  <Arrow />
                  <span className="sr-only">(opens in a new tab)</span>
                </span>
              </a>
            </Reveal>
            <Reveal delay={.14}>
              <p className="px-1 pt-4 text-[14px] leading-relaxed text-faint">
                To see the work first, start with the <a className="link" href="/work/">applications</a> or the <a className="link" href="/research/">research</a>.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
mount(<Page />);
