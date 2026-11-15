import { motion } from 'motion/react';
import { mount } from '@/lib/mount';
import { Arrow, Reveal, SectionHead, staggerItem, staggerParent } from '@/components/ui';
import { LAB } from '@/data/projects';
import { LAB_GROUPS, EXPERIMENTS } from '@/data/lab';
import { LabCard, CardGrid } from '@/components/lab/LabCards';
import { AStarDemo } from '@/components/lab/AStarDemo';

const NAV2 = LAB.find(l => l.slug === 'ros2-nav2');

function Hero() {
  const index = [
    ...LAB_GROUPS.map(g => {
      const items = LAB.filter(l => l.group === g.id);
      const sims = items.filter(l => l.kind === 'Simulation').length;
      const parts = [sims && `${sims} simulator${sims > 1 ? 's' : ''}`, items.length - sims && `${items.length - sims} write-up${items.length - sims > 1 ? 's' : ''}`].filter(Boolean);
      return { href: `#${g.id.toLowerCase().replace(/\s+/g, '-')}`, label: g.id, n: parts.join(' · ') };
    }),
    { href: '#pathfinding', label: 'Path-finding, hands on', n: 'interactive demo' }
  ];
  return (
    <section className="relative overflow-hidden border-b border-line" aria-labelledby="lab-title">
      <div className="dot-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_10%,black,transparent_65%)]" aria-hidden="true" />
      <motion.div variants={staggerParent} initial="hidden" animate="show" className="wrap relative grid gap-12 pb-20 pt-32 sm:pt-40 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-16 lg:pb-28">
        <div>
          <motion.div variants={staggerItem} className="eyebrow">Engineering Lab</motion.div>
          <motion.h1 variants={staggerItem} id="lab-title" className="display mt-6 max-w-[16ch] text-[clamp(2.3rem,4.8vw,3.9rem)] text-ink">Projects to explore, from mobile robots to microcontrollers</motion.h1>
          <motion.p variants={staggerItem} className="lede mt-7 max-w-2xl">
            Robotics, autonomous systems, embedded computing and edge ML are part of my technical work and interests. On this page they appear as projects: interactive simulators that run in your browser, and write-ups of hardware builds. Each card says which it is. AI engineering has <a href="/ai/" className="text-teal">its own page</a>.
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

function RoboticsSection() {
  return (
    <section className="border-y border-line bg-tint" aria-labelledby="robotics-title">
      <div className="wrap py-24 sm:py-32">
        <SectionHead id="robotics-title" eyebrow="Robotics and embedded" title="From mobile robots down to the microcontroller"
          intro="Simulators reproduce an algorithm in the browser, with its assumptions stated on the page and nothing validated on hardware. Write-ups describe a physical build." />
        <div className="grid gap-20">
          {LAB_GROUPS.map(g => {
            const items = LAB.filter(l => l.group === g.id);
            const id = g.id.toLowerCase().replace(/\s+/g, '-');
            return (
              <div key={g.id} id={id}>
                <Reveal className="mb-8 flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
                  <h3 className="text-[1.45rem] font-semibold tracking-tight text-ink">{g.id}</h3>
                  <p className="max-w-xl text-[14.5px] leading-relaxed text-muted sm:text-right">{g.blurb}</p>
                </Reveal>
                <CardGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(item => <LabCard key={item.slug} item={item} />)}
                </CardGrid>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PathSection() {
  return (
    <section id="pathfinding" className="wrap py-24 sm:py-32" aria-labelledby="path-title">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
        <SectionHead id="path-title" eyebrow="Try it" title="How a robot finds the shortest way around"
          intro="Draw walls and watch A* search the grid. It always expands the cell with the lowest cost so far plus an estimate of the distance left, so the search leans toward the goal and still returns a shortest path." />
        <Reveal className="mb-12 grid gap-3 text-[14px] leading-relaxed text-muted">
          <p>Switch to Dijkstra to drop the estimate: the path is just as short, but the search spreads out evenly and explores far more cells.</p>
          <p>
            The <a href={NAV2?.href} className="link">ROS 2 Nav2 Simulator</a> runs the same planner on an inflated costmap, then hands the path to a pure pursuit controller and replans when obstacles appear.
          </p>
        </Reveal>
      </div>
      <Reveal><AStarDemo /></Reveal>
      <p className="mt-4 text-[12.5px] text-faint">Moves go in eight directions, diagonals cost √2 and may not cut a wall corner. Keyboard: arrow keys move the cursor, Space toggles a wall, S and G place the start and goal, F runs the search.</p>
    </section>
  );
}

function Experiments() {
  return (
    <section className="border-t border-line" aria-labelledby="exp-title">
      <div className="wrap flex flex-col gap-6 py-14 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="exp-title" className="eyebrow">Experiments</h2>
          <p className="mt-2 text-[15px] text-muted">Two games written from scratch, for fun.</p>
        </div>
        <ul className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {EXPERIMENTS.map(e => (
            <li key={e.href}>
              <a href={e.href} className="group flex items-center justify-between gap-6 rounded-2xl border border-line bg-card px-5 py-4 no-underline transition-colors hover:border-[color-mix(in_srgb,var(--c-green)_45%,var(--c-border))] sm:max-w-[320px]">
                <span>
                  <span className="block text-[14.5px] font-medium text-ink">{e.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-faint">{e.desc}</span>
                </span>
                <span className="text-teal"><Arrow /></span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Page() {
  return (
    <>
      <Hero />
      <RoboticsSection />
      <PathSection />
      <Experiments />
    </>
  );
}
mount(<Page />);
