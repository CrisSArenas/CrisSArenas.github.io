import { Reveal, KindBadge, Arrow, Button } from '@/components/ui';
import { PAPER, ABOUT, EMAIL, LINKEDIN } from '@/data/site';
import { LAB } from '@/data/projects';
import { MailIcon, LinkedInIcon } from './Hero';

const ext = <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5" /></svg>;

/* published paper beside the Engineering Lab teaser */
export function ResearchAndLab() {
  const sims = LAB.filter(l => l.kind === 'Simulation');
  return (
    <section aria-label="Research and Engineering Lab" className="relative py-20 sm:py-28">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-line" />
      <div className="wrap grid gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <article id="research" aria-labelledby="research-h" className="surface relative flex h-full flex-col overflow-hidden p-7 sm:p-10">
            <div aria-hidden="true" className="dot-bg pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_top_left,#000,transparent_50%)]" />
            <div className="relative flex flex-1 flex-col">
              <div className="eyebrow">Research</div>
              <div className="mt-6"><KindBadge kind="Published paper" /></div>
              <h2 id="research-h" className="mt-4 max-w-2xl text-[clamp(1.35rem,2.3vw,1.8rem)] font-semibold leading-[1.2] tracking-[-.02em] text-ink">{PAPER.title}</h2>
              <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-muted">
                It tests whether a transformer that learns market regimes and portfolio weights together builds better multi-asset portfolios, on simulated markets where the true regimes are known.
              </p>
              <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-9">
                <Button href={PAPER.summary} variant="primary" size="sm" className="group">Read the summary <Arrow /></Button>
                <Button href={PAPER.ssrn} variant="outline" size="sm" external>SSRN {ext}</Button>
                <Button href={PAPER.pdf} variant="outline" size="sm" external>PDF {ext}</Button>
                <a href="/research/" className="group ml-1 inline-flex items-center gap-1.5 py-2 text-[13.5px] text-muted no-underline transition-colors hover:text-ink">All research <Arrow /></a>
              </div>
            </div>
          </article>
        </Reveal>

        <Reveal delay={.08} className="lg:col-span-5">
          <article id="lab" aria-labelledby="lab-h" className="work-card surface group relative flex h-full flex-col p-7 sm:p-10">
            <div className="eyebrow">Engineering Lab</div>
            <h2 id="lab-h" className="mt-6 text-[clamp(1.35rem,2.3vw,1.8rem)] font-semibold leading-[1.2] tracking-[-.02em] text-ink">
              <a href="/lab/" className="no-underline outline-none after:absolute after:inset-0 after:rounded-[20px] after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-teal">Robotics, embedded systems and edge ML</a>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">Interactive simulators you can run in the browser, alongside hardware write-ups.</p>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {sims.map(s => (
                <li key={s.slug} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-[14px] text-ink">{s.title}</span>
                  <span className="hidden shrink-0 font-mono text-[10.5px] uppercase tracking-[.1em] text-faint sm:inline">{s.group}</span>
                </li>
              ))}
            </ul>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-7 text-[14px] font-medium text-teal">Visit the lab <Arrow /></span>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-h" className="relative py-20 sm:py-28">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-line" />
      <div className="wrap grid gap-8 lg:grid-cols-[minmax(0,.35fr)_minmax(0,1fr)] lg:gap-16">
        <Reveal>
          <div className="eyebrow">About</div>
          <h2 id="about-h" className="display mt-4 text-[clamp(1.8rem,3vw,2.4rem)] text-ink">Background</h2>
        </Reveal>
        <Reveal delay={.06}>
          <p className="text-[clamp(1.15rem,1.9vw,1.5rem)] leading-[1.55] tracking-[-.01em] text-ink">{ABOUT[0]}</p>
          <a href="/about/" className="group mt-8 inline-flex items-center gap-1.5 text-[15px] text-teal no-underline">More about my background <Arrow /></a>
        </Reveal>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section id="contact" aria-labelledby="contact-h" className="pb-8 pt-8 sm:pt-12">
      <div className="wrap">
        <Reveal>
          <div className="surface relative overflow-hidden px-7 py-14 sm:px-14 sm:py-20">
            <div aria-hidden="true" className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_80%_at_85%_50%,#000,transparent_70%)]" />
            <div aria-hidden="true" className="home-hero-wash pointer-events-none absolute inset-0" />
            <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-end">
              <div>
                <div className="eyebrow">Contact</div>
                <h2 id="contact-h" className="display mt-4 text-[clamp(2.2rem,5vw,3.6rem)] text-ink">Get in touch</h2>
                <p className="lede mt-5 max-w-xl">If you have a question about the work or would like to talk about investment management or AI engineering, email reaches me fastest.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Button href={`mailto:${EMAIL}`} variant="primary"><MailIcon className="size-4" />{EMAIL}</Button>
                <Button href={LINKEDIN} variant="outline" external><LinkedInIcon className="size-4" />LinkedIn</Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
