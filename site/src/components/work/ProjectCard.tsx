import { AREAS, statFor, type Project } from '@/data/projects';
import { KindBadge, Tag, Arrow } from '@/components/ui';
import { MiniChart } from '@/components/MiniChart';
import { Preview } from './Preview';

/* A project on /work/: real screenshot, what it is, the live base-case number and links to the case study and
   the application. The title link covers the card; the application link sits above it. */
export function ProjectCard({ p }: { p: Project }) {
  const s = statFor(p);
  return (
    <article className="pcard group surface relative flex h-full flex-col overflow-hidden">
      <div className="pcard-shot relative aspect-[16/10] overflow-hidden border-b border-line bg-panel">
        <Preview slug={p.slug} title={p.title} />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <KindBadge kind={p.kind} />
          <span className="font-mono text-[11px] uppercase tracking-[.12em] text-faint" aria-hidden="true">·</span>
          <span className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">{AREAS[p.area].label}</span>
        </div>
        <h3 className="mt-3 text-[1.28rem] font-semibold leading-tight tracking-[-.02em] text-ink">
          <a href={`/work/${p.slug}/`} className="no-underline after:absolute after:inset-0 after:z-[1] after:rounded-[20px] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-teal">
            {p.title}
          </a>
        </h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{p.summary}</p>
        {s && (
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_112px] items-end gap-4 rounded-2xl border border-line bg-panel/60 px-4 py-3.5">
            <div className="min-w-0">
              <div className="num text-[1.6rem] font-semibold leading-none tracking-tight text-ink">{s.value}</div>
              <div className="mt-1.5 text-[12.5px] leading-snug text-muted">{s.label}</div>
            </div>
            <MiniChart stat={s} />
          </div>
        )}
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Methods">
          {p.tags.map(t => <li key={t}><Tag>{t}</Tag></li>)}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-4 pt-6 text-[13.5px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-ink" aria-hidden="true">Case study <Arrow /></span>
          <a href={p.href} className="relative z-[2] inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-teal no-underline ring-1 ring-inset ring-line-strong transition-colors hover:ring-teal">
            Open the application<span className="sr-only">: {p.title}</span>
            <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5" /></svg>
          </a>
        </div>
      </div>
    </article>
  );
}
