import { motion } from 'motion/react';
import { mount } from '@/lib/mount';
import { Reveal } from '@/components/ui';
import { NAME, TITLE, ABOUT, ABOUT_HIGHLIGHTS } from '@/data/site';
import { Highlighted } from '@/components/about/Highlighted';
import { Expertise, HowIWork, Experience, NextLinks } from '@/components/about/Sections';
import { PARAGRAPH_LABELS } from '@/components/about/content';
import '@/components/about/about.css';

const ease = [.25, 1, .5, 1] as const;

function Portrait() {
  return (
    <motion.figure className="m-0" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .15, ease }}>
      <div className="about-photo-stack"><div className="frame aspect-[4/5] max-lg:aspect-square">
        <motion.img src="/assets/images/profile-800.webp" srcSet="/assets/images/profile-800.webp 800w, /assets/images/profile-1200.webp 1200w"
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 420px, 92vw" width={800} height={1000} alt={NAME} decoding="async" fetchPriority="high"
          className="object-[50%_18%]" initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 1.4, delay: .15, ease }} />
      </div></div>
      <figcaption className="mt-9 flex items-center gap-3 text-[13px]">
        <span className="h-px w-6 bg-teal" aria-hidden="true" />
        <span className="text-ink">{NAME}</span>
      </figcaption>
    </motion.figure>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="about-h">
      <div className="grid-bg about-hero-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="wrap pt-32 pb-4 md:pt-44">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease }}>
          <div className="eyebrow mb-6">About · {NAME}</div>
          <h1 id="about-h" className="display max-w-[16ch] text-[clamp(2.4rem,6.2vw,5rem)] text-ink">{TITLE}</h1>
        </motion.div>
      </div>
    </section>
  );
}

function Story() {
  const [first, ...rest] = ABOUT;
  return (
    <section className="wrap pt-14 md:pt-20" aria-label="Background">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="max-w-[420px] lg:sticky lg:top-28 lg:self-start">
          <Portrait />
        </div>
        <div className="about-prose">
          <Reveal>
            <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[.16em] text-faint">{PARAGRAPH_LABELS[0]}</div>
            <p className="text-[clamp(1.2rem,1.9vw,1.5rem)] font-normal leading-[1.55] tracking-[-.01em] text-ink">
              <Highlighted text={first} phrases={ABOUT_HIGHLIGHTS} />
            </p>
          </Reveal>
          <div className="mt-12 space-y-10 border-t border-line pt-10">
            {rest.map((para, i) => (
              <Reveal key={i} className="grid gap-3 xl:grid-cols-[7.5rem_minmax(0,1fr)] xl:gap-8">
                <div className="pt-[.45rem] font-mono text-[10.5px] uppercase tracking-[.16em] text-faint">{PARAGRAPH_LABELS[i + 1]}</div>
                <p className="max-w-[64ch] text-[16.5px] leading-[1.8] text-muted">
                  <Highlighted text={para} phrases={ABOUT_HIGHLIGHTS} />
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Page() {
  return (
    <>
      <Hero />
      <Story />
      <Expertise />
      <HowIWork />
      <Experience />
      <NextLinks />
    </>
  );
}
mount(<Page />);
