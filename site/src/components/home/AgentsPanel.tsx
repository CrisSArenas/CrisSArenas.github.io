import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, animate, useInView, useReducedMotion } from 'motion/react';
import { Arrow } from '@/components/ui';
import { AGENT_STEPS, AGENT_TASK, type AgentNode, type AgentStep } from '@/data/home';
import { useWidth } from './useSize';
import { bySlug } from '@/data/projects';

const lab = bySlug('ai-engineering-lab');

type Pt = [number, number];
const N = AGENT_STEPS.length;
const NAMES: Record<AgentNode, string> = { task: 'Task', orch: 'Orchestrator', reader: 'Reader', analyst: 'Analyst', verifier: 'Verifier', gate: 'Human approval', act: 'Action' };
const SUBS: Record<AgentNode, string> = { task: 'request', orch: 'plans, routes', reader: 'retrieval', analyst: 'drafts', verifier: 'checks support', gate: 'approval gate', act: 'audit logged' };

/* node positions and edge polylines, computed at the panel's real pixel width */
function layout(W: number) {
  const pad = 2, gap = W < 420 ? 10 : 16, colW = (W - 2 * pad - 2 * gap) / 3, h = 42;
  const cx = [pad + colW / 2, W / 2, W - pad - colW / 2];
  const ry = W < 420 ? [4, 106, 208] : [4, 120, 236];
  const box = (c: number, r: number) => ({ x: cx[c] - colW / 2, y: ry[r], w: colW, h, cx: cx[c], cy: ry[r] + h / 2 });
  const nodes: Record<AgentNode, ReturnType<typeof box>> = {
    task: box(0, 0), orch: box(1, 0), reader: box(0, 1), analyst: box(1, 1), verifier: box(2, 1), gate: box(1, 2), act: box(2, 2)
  };
  const off = W < 420 ? 24 : 30, bus1 = ry[0] + h + off, bus2 = ry[1] + h + off;
  const o = nodes.orch, v = nodes.verifier, a = nodes.analyst, g = nodes.gate;
  const arc: Pt[] = [];
  const p0: Pt = [v.x + 12, v.y], p1: Pt = [v.x + 12, v.y - (W < 420 ? 22 : 28)], p2: Pt = [a.x + a.w - 12, a.y - (W < 420 ? 22 : 28)], p3: Pt = [a.x + a.w - 12, a.y];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, u = 1 - t;
    arc.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  const edges: Record<string, Pt[]> = {
    'task-orch': [[nodes.task.x + colW, nodes.task.cy], [o.x, o.cy]],
    'orch-reader': [[o.cx, o.y + h], [o.cx, bus1], [nodes.reader.cx, bus1], [nodes.reader.cx, nodes.reader.y]],
    'orch-analyst': [[o.cx, o.y + h], [a.cx, a.y]],
    'orch-verifier': [[o.cx, o.y + h], [o.cx, bus1], [v.cx, bus1], [v.cx, v.y]],
    'verifier-analyst': arc,
    'verifier-gate': [[v.cx, v.y + h], [v.cx, bus2], [g.cx, bus2], [g.cx, g.y]],
    'gate-act': [[g.x + colW, g.cy], [nodes.act.x, nodes.act.cy]]
  };
  return { nodes, edges, H: ry[2] + h + 4, colW, legend: { x: pad + 2, y: ry[2] + 4 } };
}

const d = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
function along(pts: Pt[], t: number): Pt {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let L = seg.reduce((s, x) => s + x, 0) * t;
  for (let i = 0; i < seg.length; i++) {
    if (L <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? Math.min(1, L / seg[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
    }
    L -= seg[i];
  }
  return pts[pts.length - 1];
}

const tone = (s?: AgentStep['status']) => s === 'reject' ? 'neg' : s === 'wait' ? 'sand' : s ? 'teal' : 'idle';

export function AgentsPanel() {
  const reduce = useReducedMotion();
  const [k, setK] = useState(reduce ? N : 0);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(1);
  const [wrapRef, W] = useWidth<HTMLDivElement>(480);
  const inView = useInView(wrapRef, { once: true });
  const traceRef = useRef<HTMLOListElement>(null);
  const L = useMemo(() => layout(W), [W]);

  useEffect(() => { if (reduce) { setK(N); setPlaying(false); } }, [reduce]);
  useEffect(() => { if (inView && !reduce) setPlaying(true); }, [inView, reduce]);

  /* advance on a timer while playing; the approval step holds a little longer */
  useEffect(() => {
    if (!playing) return;
    if (k >= N) { setPlaying(false); return; }
    const wait = k === 0 ? 500 : AGENT_STEPS[k - 1].status === 'wait' ? 2300 : AGENT_STEPS[k - 1].status === 'reject' ? 2000 : 1500;
    const id = window.setTimeout(() => setK(x => Math.min(N, x + 1)), wait);
    return () => window.clearTimeout(id);
  }, [playing, k]);

  /* move a packet along the edge the latest step used */
  useEffect(() => {
    if (reduce || k === 0) { setT(1); return; }
    setT(0);
    const c = animate(0, 1, { duration: .65, ease: [.45, 0, .2, 1], onUpdate: setT });
    return () => c.stop();
  }, [k, reduce]);

  useEffect(() => { const el = traceRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); }, [k, reduce]);

  const done = AGENT_STEPS.slice(0, k);
  const state: Partial<Record<AgentNode, AgentStep['status']>> = { task: k > 0 ? 'ok' : undefined };
  done.forEach(s => { state[s.node] = s.status; });
  const cur = k > 0 ? AGENT_STEPS[k - 1] : undefined;
  const used = new Set(done.filter(s => s.from).map(s => `${s.from}-${s.node}`));
  const rejected = done.some(s => s.status === 'reject');
  const curEdge = cur?.from ? `${cur.from}-${cur.node}` : '';
  const packet = curEdge && t < 1 ? along(L.edges[curEdge], t) : null;

  const onPlay = () => {
    if (playing) { setPlaying(false); return; }
    if (k >= N) setK(0);
    setPlaying(true);
  };
  const onStep = () => { setPlaying(false); setK(x => (x >= N ? 1 : x + 1)); };
  const onReset = () => { setPlaying(false); setK(0); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-sand/[.08] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[.12em] text-sand-ink ring-1 ring-inset ring-sand/30">Illustration of the pattern</span>
        <span className="text-[13px] text-muted"><span className="mr-2 font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">Task</span>{AGENT_TASK}</span>
      </div>

      <div ref={wrapRef}>
        <svg width={W} height={L.H} viewBox={`0 0 ${W} ${L.H}`} className="block overflow-visible" role="img"
          aria-label="Agent workflow: a task goes to an orchestrator, which hands work to a reader, an analyst and a verifier. The verifier can send a draft back to the analyst. Accepted work waits at a human approval gate before any action.">
          <defs>
            <marker id="ag-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L8 4L0 8z" className="fill-graphite" />
            </marker>
          </defs>
          {Object.entries(L.edges).map(([key, pts]) => {
            if (key === 'verifier-analyst' && !rejected) return null;
            const isRerun = key === 'verifier-analyst';
            const lit = used.has(key);
            return (
              <path key={key} d={d(pts)} fill="none" strokeWidth={lit ? 1.6 : 1.2} strokeLinejoin="round"
                className={`transition-[stroke] duration-500 ${isRerun ? 'stroke-neg' : lit ? 'stroke-teal' : 'stroke-line-strong'}`}
                strokeDasharray={isRerun ? '4 4' : undefined} markerEnd={isRerun ? undefined : 'url(#ag-arrow)'} />
            );
          })}
          {rejected && (
            <text x={(L.nodes.analyst.x + L.nodes.analyst.w + L.nodes.verifier.x) / 2} y={L.nodes.verifier.y - (W < 420 ? 23 : 28)} textAnchor="middle" className="fill-neg font-mono text-[10px]">rerun</text>
          )}
          {(Object.keys(L.nodes) as AgentNode[]).map(id => {
            const b = L.nodes[id], st = state[id], tn = tone(st), active = cur?.node === id;
            const ring = tn === 'neg' ? 'stroke-neg' : tn === 'sand' ? 'stroke-sand' : tn === 'teal' ? 'stroke-teal' : 'stroke-line-strong';
            const fill = active ? (tn === 'neg' ? 'ag-fill-neg' : tn === 'sand' ? 'ag-fill-sand' : 'ag-fill-teal') : 'fill-card';
            const small = W < 420;
            return (
              <g key={id}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} className={`${fill} ${ring} transition-[fill,stroke] duration-300`} strokeWidth={active ? 1.6 : 1} />
                {id === 'gate' && st === 'wait' && <circle cx={b.x + b.w - 10} cy={b.y + 10} r={3} className="ag-pulse fill-sand" />}
                <text x={b.cx} y={b.y + (small ? 18 : 18)} textAnchor="middle" className={`${st || id === 'task' ? 'fill-ink' : 'fill-muted'} text-[12px] font-medium`}>{small && id === 'gate' ? 'Approval' : small && id === 'orch' ? 'Orchestrator' : NAMES[id]}</text>
                <text x={b.cx} y={b.y + 32} textAnchor="middle" className={`font-mono text-[9.5px] ${tn === 'neg' ? 'fill-neg' : tn === 'sand' ? 'fill-sand-ink' : 'fill-faint'}`}>
                  {tn === 'neg' ? 'rejected' : tn === 'sand' ? 'waiting' : id === 'gate' && st === 'ok' ? 'approved' : SUBS[id]}
                </text>
              </g>
            );
          })}
          <g transform={`translate(${L.legend.x},${L.legend.y})`} className="font-mono text-[9.5px]" aria-hidden="true">
            <line x1={0} x2={18} y1={6} y2={6} className="stroke-teal" strokeWidth={1.6} /><text x={26} y={9} className="fill-faint">handoff</text>
            <line x1={0} x2={18} y1={21} y2={21} className="stroke-neg" strokeWidth={1.4} strokeDasharray="4 4" /><text x={26} y={24} className="fill-faint">sent back</text>
            <circle cx={9} cy={36} r={3} className="fill-sand" /><text x={26} y={39} className="fill-faint">{W < 420 ? 'waiting' : 'waits for a person'}</text>
          </g>
          {packet && <circle cx={packet[0]} cy={packet[1]} r={4} className={cur?.status === 'reject' || curEdge === 'verifier-analyst' ? 'fill-neg' : 'fill-teal'} />}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CtlButton onClick={onPlay} label={playing ? 'Pause' : k >= N ? 'Replay' : 'Play'}>
            {playing ? <path d="M5 3.5v9M11 3.5v9" /> : <path d="M5 3l8 5-8 5z" fill="currentColor" />}
          </CtlButton>
          <CtlButton onClick={onStep} label="Step"><path d="M4 3l6 5-6 5zM12.5 3.5v9" /></CtlButton>
          <button type="button" onClick={onReset} className="h-10 rounded-full px-3 text-[13px] text-muted transition-colors hover:text-ink">Reset</button>
        </div>
        <span className="num font-mono text-[11px] uppercase tracking-[.12em] text-faint">Step {k} of {N}</span>
      </div>

      <ol ref={traceRef} aria-label="Run trace" aria-live="polite" className="h-[150px] overflow-y-auto sm:h-[172px] rounded-xl border border-line bg-page/60 p-1.5 [scrollbar-width:thin]">
        {k === 0 && <li className="px-3 py-2.5 text-[12.5px] text-faint">Press Play or Step to start the run.</li>}
        <AnimatePresence initial={false}>
          {done.map((s, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .3 }}
              className={`grid grid-cols-[22px_96px_minmax(0,1fr)] items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] leading-snug max-sm:grid-cols-[22px_minmax(0,1fr)] ${i === k - 1 ? 'bg-panel' : ''}`}>
              <span className="num font-mono text-[10.5px] text-faint">{String(i + 1).padStart(2, '0')}</span>
              <span className={`font-mono text-[11px] max-sm:hidden ${s.status === 'reject' ? 'text-neg' : s.status === 'wait' ? 'text-sand-ink' : 'text-teal'}`}>{NAMES[s.node].toLowerCase()}</span>
              <span className="text-muted"><span className={`font-mono text-[11px] sm:hidden ${s.status === 'reject' ? 'text-neg' : s.status === 'wait' ? 'text-sand-ink' : 'text-teal'}`}>{NAMES[s.node].toLowerCase()} </span>{s.text}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      <p className="text-[13px] leading-relaxed text-muted">
        A scripted run that shows the shape of the workflow. The working version, with real retrieval, permission checks, a verifier and approval gates driven by deterministic rules in place of a language model, runs in the{' '}
        <a href={lab?.href} className="group inline-flex items-center gap-1 link">{lab?.title} <Arrow /></a>
      </p>
    </div>
  );
}

function CtlButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-ink ring-1 ring-inset ring-line-strong transition-[box-shadow,color] hover:ring-teal">
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
      {label}
    </button>
  );
}
