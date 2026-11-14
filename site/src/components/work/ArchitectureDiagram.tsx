import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import type { FlowEdge, FlowNode, NodeKind } from '@/data/cases';

/* How an application works, drawn as a left-to-right flow (stacked top to bottom on narrow screens).
   Columns come from the graph itself: each node sits one step after the latest node that feeds it, and
   final outputs line up in the last column. Hover, focus or tap a node to light up its connections and
   read a one-line explanation. Edges are measured from the laid-out nodes, so any width works. */

export const KIND_LABEL: Record<NodeKind, string> = { input: 'Input', model: 'Model or agent', check: 'Check', human: 'Human approval', output: 'Output' };
const KIND_ORDER: NodeKind[] = ['input', 'model', 'check', 'human', 'output'];

function layers(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[][] {
  const preds = new Map<string, string[]>(nodes.map(n => [n.id, []]));
  edges.forEach(e => preds.get(e.to)?.push(e.from));
  const depth = new Map<string, number>();
  const visit = (id: string, guard: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (guard.has(id)) return 0;
    guard.add(id);
    const p = preds.get(id) || [];
    const d = p.length ? Math.max(...p.map(x => visit(x, guard) + 1)) : 0;
    depth.set(id, d);
    return d;
  };
  nodes.forEach(n => visit(n.id, new Set()));
  const hasOut = new Set(edges.map(e => e.from));
  const max = Math.max(...depth.values());
  /* sinks that are outputs line up at the end */
  nodes.forEach(n => { if (n.kind === 'output' && !hasOut.has(n.id)) depth.set(n.id, max); });
  const cols: FlowNode[][] = Array.from({ length: max + 1 }, () => []);
  nodes.forEach(n => cols[depth.get(n.id)!].push(n));
  /* one barycentre pass: order each column by the average row of the nodes feeding it */
  const row = new Map<string, number>();
  cols[0].forEach((n, i) => row.set(n.id, i));
  for (let c = 1; c < cols.length; c++) {
    const key = (n: FlowNode) => { const p = (preds.get(n.id) || []).filter(x => row.has(x)); return p.length ? p.reduce((s, x) => s + row.get(x)!, 0) / p.length : 0; };
    const idx = new Map(cols[c].map((n, i) => [n.id, i]));
    cols[c].sort((a, b) => key(a) - key(b) || idx.get(a.id)! - idx.get(b.id)!);
    cols[c].forEach((n, i) => row.set(n.id, i));
  }
  return cols.filter(c => c.length);
}

const marker: Record<NodeKind, string> = {
  input: 'bg-graphite-2', model: 'bg-teal', check: 'bg-teal ring-2 ring-teal/25', human: 'bg-sand', output: 'bg-ink'
};
const markerShape: Record<NodeKind, string> = { input: 'rounded-full', model: 'rounded-full', check: 'rounded-[2px] rotate-45', human: 'rounded-full', output: 'rounded-[2px]' };

interface Geo { id: string; x: number; y: number; w: number; h: number }
interface Path { key: string; from: string; to: string; d: string; end: [number, number] }

function route(a: Geo, b: Geo, vertical: boolean): Path['d'] {
  if (!vertical) {
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, dx = Math.max(28, (x2 - x1) * .5);
    return `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
  }
  const x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y, dy = Math.max(20, (y2 - y1) * .5);
  return `M${x1} ${y1} C${x1} ${y1 + dy} ${x2} ${y2 - dy} ${x2} ${y2}`;
}

export function ArchitectureDiagram({ nodes, edges, caption, title }: { nodes: FlowNode[]; edges: FlowEdge[]; caption: string; title: string }) {
  const cols = useMemo(() => layers(nodes, edges), [nodes, edges]);
  const order = useMemo(() => cols.flat(), [cols]);
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const box = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const [paths, setPaths] = useState<Path[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [vertical, setVertical] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = hover ?? pinned;
  const inView = useInView(box, { once: true, margin: '0px 0px -15% 0px' });
  const reduce = useReducedMotion();
  const shown = inView || !!reduce;
  /* after the entrance, hover changes should respond at once */
  const [ready, setReady] = useState(false);
  useEffect(() => { if (!shown) return; const t = setTimeout(() => setReady(true), 1400); return () => clearTimeout(t); }, [shown]);

  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const v = el.clientWidth < 960;
    setVertical(v);
    const geo = new Map<string, Geo>();
    refs.current.forEach((b, id) => geo.set(id, { id, x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }));
    setSize({ w: el.clientWidth, h: el.clientHeight });
    setPaths(edges.flatMap(e => {
      const a = geo.get(e.from), b = geo.get(e.to);
      if (!a || !b) return [];
      const d = route(a, b, v);
      const end: [number, number] = v ? [b.x + b.w / 2, b.y] : [b.x, b.y + b.h / 2];
      return [{ key: e.from + '>' + e.to, from: e.from, to: e.to, d, end }];
    }));
  }, [edges]);

  useLayoutEffect(() => {
    measure();
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => ro.disconnect();
  }, [measure]);
  /* the layout switches between rows and columns at the breakpoint, so measure again after it renders */
  useLayoutEffect(() => { measure(); }, [vertical, measure]);

  /* tap outside the diagram clears a pinned node */
  useEffect(() => {
    if (!pinned) return;
    const off = (ev: PointerEvent) => { if (box.current && !box.current.contains(ev.target as Node)) setPinned(null); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [pinned]);

  const linked = useMemo(() => {
    if (!active) return null;
    const s = new Set([active]);
    edges.forEach(e => { if (e.from === active) s.add(e.to); if (e.to === active) s.add(e.from); });
    return s;
  }, [active, edges]);
  const ins = active ? edges.filter(e => e.to === active).map(e => byId.get(e.from)?.label).filter(Boolean) : [];
  const outs = active ? edges.filter(e => e.from === active).map(e => byId.get(e.to)?.label).filter(Boolean) : [];
  const current = active ? byId.get(active) : null;
  const kinds = KIND_ORDER.filter(k => nodes.some(n => n.kind === k));
  const colIndex = useMemo(() => { const m = new Map<string, number>(); cols.forEach((c, i) => c.forEach(n => m.set(n.id, i))); return m; }, [cols]);

  const onKey = (ev: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (ev.key === 'Escape') { setPinned(null); setHover(null); (ev.target as HTMLElement).blur(); }
    const i = order.findIndex(n => n.id === id);
    const step = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
    if (step) { ev.preventDefault(); refs.current.get(order[(i + step + order.length) % order.length].id)?.focus(); }
  };

  return (
    <figure className="m-0" aria-label={`${title}: how it works`}>
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2" aria-hidden="true">
        {kinds.map(k => (
          <span key={k} className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">
            <span className={`size-2 ${marker[k]} ${markerShape[k]}`} />{KIND_LABEL[k]}
          </span>
        ))}
      </div>
      <div className="flow-frame dot-bg relative overflow-hidden rounded-[20px] border border-line p-4 sm:p-6 lg:p-8">
        <div ref={box} className={`relative ${vertical ? 'flex flex-col gap-9' : 'grid items-center gap-x-10 xl:gap-x-12'}`}
          style={vertical ? undefined : { gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
          role="group" aria-label="Diagram steps. Use the arrow keys to move between steps.">
          <svg className="pointer-events-none absolute inset-0 overflow-visible" width={size.w} height={size.h} aria-hidden="true">
            {paths.map((p, i) => {
              const on = !!linked && (p.from === active || p.to === active);
              const dim = !!linked && !on;
              const delay = .25 + (colIndex.get(p.from) ?? 0) * .12 + i * .01;
              return (
                <g key={p.key} style={{ opacity: dim ? .25 : 1, transition: 'opacity .25s' }}>
                  <motion.path d={p.d} fill="none" stroke="var(--flow-edge)" strokeWidth={1.4}
                    initial={reduce ? false : { pathLength: 0, opacity: 0 }} animate={shown ? { pathLength: 1, opacity: 1 } : undefined}
                    transition={{ duration: .9, delay, ease: [.25, 1, .5, 1] }} />
                  {on && <path className="flow-live" d={p.d} fill="none" stroke="var(--c-green)" strokeWidth={1.75} />}
                  <motion.circle cx={p.end[0]} cy={p.end[1]} r={on ? 3.2 : 2.4} fill={on ? 'var(--c-green)' : 'var(--flow-edge)'}
                    initial={reduce ? false : { opacity: 0 }} animate={shown ? { opacity: 1 } : undefined} transition={{ duration: .3, delay: delay + .6 }} />
                </g>
              );
            })}
          </svg>
          {cols.map((col, ci) => (
            <div key={ci} className={vertical ? 'flex flex-wrap justify-center gap-2.5' : 'flex flex-col justify-center gap-3'}>
              {col.map(n => {
                const on = active === n.id, near = !!linked && linked.has(n.id), dim = !!linked && !near;
                return (
                  <motion.button key={n.id} type="button" ref={el => { if (el) refs.current.set(n.id, el); else refs.current.delete(n.id); }}
                    aria-pressed={pinned === n.id}
                    onPointerEnter={ev => { if (ev.pointerType === 'mouse') setHover(n.id); }}
                    onPointerLeave={ev => { if (ev.pointerType === 'mouse') setHover(null); }}
                    onFocus={() => setHover(n.id)} onBlur={() => setHover(null)}
                    onClick={() => setPinned(p => (p === n.id ? null : n.id))}
                    onKeyDown={ev => onKey(ev, n.id)}
                    initial={reduce ? false : { opacity: 0, y: 10 }} animate={shown ? { opacity: dim ? .38 : 1, y: 0 } : undefined}
                    transition={{ duration: .5, delay: ready ? 0 : ci * .12, ease: [.25, 1, .5, 1] }}
                    className={`flow-node relative z-[1] min-h-[44px] rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-200 ${vertical ? 'w-[calc(50%-5px)] sm:w-[calc(33.333%-7px)] md:w-[180px]' : 'w-full'} ${on ? 'border-teal bg-card shadow-[0_0_0_3px_color-mix(in_srgb,var(--c-green)_14%,transparent)]' : near ? 'border-teal/50 bg-card' : n.kind === 'human' ? 'border-sand/45 bg-card' : 'border-line-strong bg-card'}`}>
                    <span className="flex items-start gap-2">
                      <span className={`mt-[5px] size-2 shrink-0 ${marker[n.kind]} ${markerShape[n.kind]}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium leading-snug text-ink">{n.label}</span>
                        {n.sub && <span className="mt-0.5 block font-mono text-[10.5px] leading-snug text-faint">{n.sub}</span>}
                        <span className="sr-only">. {KIND_LABEL[n.kind]}. {n.note}</span>
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className={`flow-note z-10 mt-4 lg:static ${current ? 'sticky bottom-3' : ''}`}>
        <div id="flow-note" aria-live="polite" className="surface-2 min-h-[76px] px-5 py-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,.35)] lg:shadow-none">
          {current ? (
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`size-2 ${marker[current.kind]} ${markerShape[current.kind]}`} aria-hidden="true" />
                <span className="text-[14.5px] font-medium text-ink">{current.label}</span>
                <span className="font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">{KIND_LABEL[current.kind]}</span>
              </div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{current.note}</p>
              {(ins.length > 0 || outs.length > 0) && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-faint">
                  {ins.length > 0 && <>From {ins.join(', ')}. </>}
                  {outs.length > 0 && <>Feeds {outs.join(', ')}.</>}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[14px] leading-relaxed text-muted"><span className="text-ink">{caption}</span> <span className="text-faint">Hover, focus or tap a step to see what it does and what it connects to.</span></p>
          )}
        </div>
      </div>
    </figure>
  );
}
