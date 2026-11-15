import { motion } from 'motion/react';
import { mount } from '@/lib/mount';
import { Arrow, Button, Reveal, SectionHead, staggerItem, staggerParent } from '@/components/ui';
import { PROJECTS } from '@/data/projects';
import { AppCard, CardGrid } from '@/components/lab/LabCards';
import { ArchExplorer } from '@/components/lab/ArchExplorer';
import { AiSection } from '@/components/home/AiSection';

const AI_APPS = PROJECTS.filter(p => p.area === 'ai');

/* the deep dive's six chapters, each linking straight to its section on /ai-systems.html */
const CHAPTERS = [
  { id: 'architecture', title: 'Reference architecture', text: 'The layers every system follows, from a gateway that knows who people are to an orchestrator that stops for a person before anything consequential happens.' },
  { id: 'multi-agent', title: 'Agentic AI systems', text: 'Agents with narrow jobs that do the first pass on work an analyst would otherwise start from a blank page.' },
  { id: 'documents', title: 'Document intelligence', text: 'Reading investment documents, pulling out the figures and terms a team needs, and linking every value to the page and line it came from.' },
  { id: 'data', title: 'Data foundations', text: 'Portfolio, accounting, market and document data in one tested, reconciled place that the investment and operations teams sign off on.' },
  { id: 'production', title: 'Running it in production', text: 'The engineering that makes these systems safe to rely on.' },
  { id: 'lifecycle', title: 'From idea to production', text: 'The full lifecycle, from the first conversation with the team to a system they rely on, with a person in the loop at every stage.' }
];

function Hero() {
  const index = [
    { href: '#applications', label: 'Applications', n: `${AI_APPS.length} working applications` },
    { href: '#layers', label: 'How the systems are built', n: '4 layers' },
    { href: '#architecture', label: 'Reference architecture', n: 'interactive diagram' },
    { href: '#deep-dive', label: 'Deep dive', n: `${CHAPTERS.length} chapters` }
  ];
  return (
    <section className="relative overflow-hidden border-b border-line" aria-labelledby="ai-title">
      <div className="dot-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_10%,black,transparent_65%)]" aria-hidden="true" />
      <motion.div variants={staggerParent} initial="hidden" animate="show" className="wrap relative grid gap-12 pb-20 pt-32 sm:pt-40 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:pb-28">
        <div>
          <motion.div variants={staggerItem} className="eyebrow">AI Engineering</motion.div>
          <motion.h1 variants={staggerItem} id="ai-title" className="display mt-6 max-w-[18ch] text-[clamp(2.3rem,4.8vw,3.9rem)] text-ink">Agentic AI systems, built for investment work</motion.h1>
          <motion.p variants={staggerItem} className="lede mt-7 max-w-2xl">
            Working applications, the layers every system is built on, and a deep dive on design, data and running them in production. The demos call no language model; retrieval, permissions, approval gates and scoring are real code running in your browser.
          </motion.p>
        </div>
        <motion.nav variants={staggerItem} aria-label="On this page" className="surface p-2">
          <ul>
            {index.map((x, i) => (
              <li key={x.href} className={i ? 'border-t border-line' : ''}>
                <a href={x.href} className="group flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 no-underline transition-colors hover:bg-panel">
                  <span className="flex items-baseline gap-3">
                    <span className="num font-mono text-[11px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[14.5px] text-ink">{x.label}</span>
                  </span>
                  <span className="flex items-center gap-3 text-[12px] text-faint"><span className="hidden sm:inline">{x.n}</span><span className="text-teal"><Arrow /></span></span>
                </a>
              </li>
            ))}
          </ul>
        </motion.nav>
      </motion.div>
    </section>
  );
}

function Applications() {
  return (
    <section id="applications" className="wrap scroll-mt-24 py-24 sm:py-32" aria-labelledby="apps-title">
      <SectionHead id="apps-title" eyebrow="Applications" title="Agentic systems, opened up"
        intro="Two working applications that show an agentic system from the inside. Each runs in your browser on synthetic data and has a case study behind it." />
      <CardGrid className="grid gap-5 lg:grid-cols-2">
        {AI_APPS.map(p => <AppCard key={p.slug} p={p} />)}
      </CardGrid>
    </section>
  );
}

function Architecture() {
  return (
    <section id="architecture" className="border-y border-line bg-tint scroll-mt-24" aria-labelledby="arch-title">
      <div className="wrap py-24 sm:py-32">
        <SectionHead id="arch-title" eyebrow="Reference architecture" title="The layers every agentic system here is built on"
          intro="People reach the system through a gateway that knows who they are. An orchestrator splits the work between narrow agents and stops for a person before anything consequential happens. Select a component to see its job and the failure it is there to prevent." />
        <Reveal><ArchExplorer /></Reveal>
      </div>
    </section>
  );
}

function DeepDive() {
  return (
    <section id="deep-dive" className="wrap scroll-mt-24 py-24 sm:py-32" aria-labelledby="dd-title">
      <SectionHead id="dd-title" eyebrow="Deep dive" title="How these systems are designed, built and run"
        intro="Six chapters, each in plain English with the technical detail one click away. Open any chapter to go straight to it." />
      <motion.ol variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-10% 0px' }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHAPTERS.map((c, i) => (
          <motion.li key={c.id} variants={staggerItem} className="surface group relative flex flex-col p-6 transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--c-green)_45%,var(--c-border))] motion-reduce:hover:translate-y-0">
            <span className="num font-mono text-[11px] text-faint">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-3 text-[1.15rem] font-semibold tracking-tight text-ink">
              <a href={`/ai-systems.html#${c.id}`} className="no-underline after:absolute after:inset-0 after:rounded-[20px] after:content-['']">{c.title}</a>
            </h3>
            <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted">{c.text}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-teal">Read the chapter <Arrow /></span>
          </motion.li>
        ))}
      </motion.ol>
      <Reveal className="mt-10 flex flex-wrap items-center gap-3">
        <Button href="/ai-systems.html" className="group">Read the whole deep dive <Arrow /></Button>
        <Button href="/contact/" variant="outline">Get in touch</Button>
      </Reveal>
    </section>
  );
}

function Page() {
  return (
    <>
      <Hero />
      <Applications />
      <AiSection id="layers" onPage />
      <Architecture />
      <DeepDive />
    </>
  );
}

mount(<Page />);
