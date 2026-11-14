import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { mount } from '@/lib/mount';
import { Reveal, Tabs, Arrow, SectionHead } from '@/components/ui';
import { AREAS, PROJECTS, LAB, type AreaId } from '@/data/projects';
import { ProjectCard } from '@/components/work/ProjectCard';
import '@/components/work/work.css';

const ease = [.25, 1, .5, 1] as const;
type Filter = 'all' | AreaId;
const AREA_IDS = (Object.keys(AREAS) as AreaId[]).filter(a => PROJECTS.some(p => p.area === a));

function readFilter(): Filter {
  try {
    const a = new URLSearchParams(location.search).get('area') as AreaId | null;
    return a && AREA_IDS.includes(a) ? a : 'all';
  } catch { return 'all'; }
}

function Hero() {
  const memos = PROJECTS.filter(p => p.memo).length, notes = PROJECTS.filter(p => p.note).length;
  const facts: [string, string][] = [[String(PROJECTS.length), 'working applications'], [String(AREA_IDS.length), 'areas of practice'], [String(memos), 'investment memos'], [String(notes), 'practitioner notes']];
  return (
    <section className="relative overflow-hidden" aria-labelledby="work-h">
      <div className="grid-bg case-hero-grid pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="wrap pt-32 md:pt-44">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease }}>
            <div className="eyebrow mb-6">Work</div>
            <h1 id="work-h" className="display max-w-[15ch] text-[clamp(2.4rem,5.6vw,4.4rem)] text-ink">Working applications, each with a case study</h1>
            <p className="lede mt-7 max-w-2xl">Each application runs in the browser on synthetic data, with its methods, assumptions and checks open to inspection. The case studies explain what each one does, why it matters and what it shows at its base case.</p>
          </motion.div>
          <motion.dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .12, ease }}>
            {facts.map(([v, l]) => (
              <div key={l} className="bg-card px-5 py-5">
                <dt className="sr-only">{l}</dt>
                <dd className="m-0"><span className="num block text-[2rem] font-semibold leading-none tracking-tight text-ink">{v}</span><span className="mt-2 block text-[13px] text-muted">{l}</span></dd>
              </div>
            ))}
          </motion.dl>
        </div>
      </div>
    </section>
  );
}

function Grid() {
  const [filter, setFilter] = useState<Filter>(readFilter);
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);
  useEffect(() => {
    try {
      const u = new URL(location.href);
      if (filter === 'all') u.searchParams.delete('area'); else u.searchParams.set('area', filter);
      history.replaceState(null, '', u.toString());
    } catch { /* history unavailable */ }
  }, [filter]);
  const list = useMemo(() => (filter === 'all' ? PROJECTS : PROJECTS.filter(p => p.area === filter)), [filter]);
  const tabs = [{ id: 'all' as Filter, label: <>All <span className="num ml-1 text-faint">{PROJECTS.length}</span></> },
    ...AREA_IDS.map(a => ({ id: a as Filter, label: <>{AREAS[a].label} <span className="num ml-1 text-faint">{PROJECTS.filter(p => p.area === a).length}</span></> }))];

  return (
    <section className="wrap pt-20 md:pt-28" aria-labelledby="apps-h">
      <h2 id="apps-h" className="sr-only">Applications</h2>
      <div className="min-w-0 max-w-full">
        <Tabs tabs={tabs} value={filter} onChange={setFilter} label="Filter applications by area" />
      </div>
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between md:gap-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={filter} className="m-0 max-w-2xl text-[14.5px] leading-relaxed text-muted" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .25 }} aria-live="polite">
            {filter === 'all' ? `All ${PROJECTS.length} applications, across ${AREA_IDS.length} areas.` : AREAS[filter].blurb}
          </motion.p>
        </AnimatePresence>
        <a href="/lab/" className="group inline-flex shrink-0 items-center gap-2 text-[13.5px] text-muted no-underline transition-colors hover:text-ink">
          Robotics and embedded systems are in the Lab <Arrow />
        </a>
      </div>
      <LayoutGroup>
        <motion.ul layout className="mt-10 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <motion.li key={p.slug} layout className="h-full"
                initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .96, transition: { duration: .2 } }}
                transition={{ duration: .5, delay: first.current ? Math.min(i, 5) * .07 : 0, ease, layout: { duration: .45, ease } }}>
                <ProjectCard p={p} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </LayoutGroup>
    </section>
  );
}

function Writing() {
  const memos = PROJECTS.filter(p => p.memo).map(p => ({ doc: p.memo!, p }));
  const notes = PROJECTS.filter(p => p.note).map(p => ({ doc: p.note!, p }));
  const List = ({ title, eyebrow, items }: { title: string; eyebrow: string; items: typeof memos }) => (
    <Reveal>
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <span className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">{eyebrow}</span>
      </div>
      <ul className="m-0 list-none p-0">
        {items.map(({ doc, p }) => (
          <li key={doc.href} className="border-b border-line">
            <a href={doc.href} className="group -mx-3 flex items-center justify-between gap-6 rounded-xl px-3 py-4 no-underline transition-colors hover:bg-panel">
              <span className="min-w-0">
                <span className="block text-[15px] leading-snug text-ink">{doc.title}</span>
                <span className="mt-1 block text-[12.5px] text-faint">With {p.title}</span>
              </span>
              <Arrow className="shrink-0 text-muted group-hover:text-teal" />
            </a>
          </li>
        ))}
      </ul>
    </Reveal>
  );
  return (
    <section className="wrap pt-28 md:pt-36" aria-labelledby="writing-h">
      <SectionHead id="writing-h" eyebrow="Memos and notes" title="Written from the applications"
        intro="Each investment memo makes a recommendation on a fictional portfolio or fund using its application's base case. Each practitioner note takes one question and shows how to test it in the application." />
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <List title="Investment memos" eyebrow={`${memos.length} memos`} items={memos} />
        <List title="Practitioner notes" eyebrow={`${notes.length} notes`} items={notes} />
      </div>
      <Reveal className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel px-6 py-5">
        <p className="m-0 text-[14.5px] text-muted">The Engineering Lab holds {LAB.length} robotics, embedded and edge ML projects, as simulators and technical write-ups.</p>
        <a href="/lab/" className="group inline-flex items-center gap-2 text-[14px] font-medium text-teal no-underline">Go to the Lab <Arrow /></a>
      </Reveal>
    </section>
  );
}

function Page() {
  return (<><Hero /><Grid /><Writing /></>);
}
mount(<Page />);
