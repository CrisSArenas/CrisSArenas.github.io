import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, animate } from 'motion/react';
import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { Disclosure } from '@/components/ui';
import { UNIVERSE, CORR } from '@/data/home';
import { covariance, frontier } from './frontier';
import { useWidth, prefersReducedMotion } from './useSize';

const MU = UNIVERSE.map(a => a.ret);
const VOL = UNIVERSE.map(a => a.vol);
const SIGMA = covariance(VOL, CORR);
const STEPS = 61;
const START = 30;
const pct = (v: number, d = 1) => (v * 100).toFixed(d) + '%';

/* where each asset's label sits relative to its dot, so labels never cover the frontier */
const LABEL: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' }> = {
  eq: { dx: 9, dy: 4, anchor: 'start' },
  pe: { dx: -6, dy: -9, anchor: 'end' },
  fi: { dx: 9, dy: 13, anchor: 'start' },
  ra: { dx: 9, dy: 13, anchor: 'start' },
  hf: { dx: 9, dy: 4, anchor: 'start' }
};

export function FrontierPanel() {
  const F = useMemo(() => frontier(MU, SIGMA, STEPS), []);
  const [idx, setIdx] = useState(() => (prefersReducedMotion() ? START : 4));
  const reduce = useReducedMotion();
  const [wrapRef, width] = useWidth<HTMLDivElement>(480);
  const inView = useInView(wrapRef, { once: true, margin: '0px 0px -15% 0px' });
  const [drawn, setDrawn] = useState(false);
  const dragging = useRef(false);

  /* a short sweep up the frontier on first view, so the curve reads as something you can move along */
  useEffect(() => {
    if (!inView || drawn) return;
    if (reduce) { setDrawn(true); return; }
    const c = animate(4, START, { duration: 1.4, delay: .5, ease: [.25, 1, .5, 1], onUpdate: v => setIdx(Math.round(v)), onComplete: () => setDrawn(true) });
    return () => c.stop();
  }, [inView, reduce, drawn]);

  const H = width < 420 ? 200 : 232;
  const m = { t: 14, r: 14, b: 34, l: 40 };
  const x = scaleLinear().domain([0.03, 0.25]).range([m.l, width - m.r]);
  const y = scaleLinear().domain([0.035, 0.09]).range([H - m.b, m.t]);
  const path = line<{ vol: number; ret: number }>().x(d => x(d.vol)).y(d => y(d.ret)).curve(curveMonotoneX)(F) || '';
  const p = F[idx];

  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const v = x.invert(clientX - r.left);
    let best = 0;
    F.forEach((q, i) => { if (Math.abs(q.vol - v) < Math.abs(F[best].vol - v)) best = i; });
    setIdx(best); setDrawn(true);
  };

  const holds = p.w.filter(w => w > 0.005).length;
  const valueText = `Expected return ${pct(p.ret)}, volatility ${pct(p.vol)}`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-end justify-between gap-4">
        <div className="flex gap-6 sm:gap-8">
          <Readout label="Expected return" value={pct(p.ret)} />
          <Readout label="Volatility" value={pct(p.vol)} />
        </div>
        <div className="pb-1 text-right font-mono text-[11px] uppercase tracking-[.12em] text-faint">{holds} of 5<br className="sm:hidden" /> held</div>
      </div>

      <div ref={wrapRef} className="relative">
        <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} className="block touch-pan-y select-none overflow-visible"
          role="img" aria-label={`Long-only efficient frontier for five asset classes. Selected portfolio: ${valueText}.`}
          onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX, e.currentTarget); }}
          onPointerMove={e => { if (dragging.current) pick(e.clientX, e.currentTarget); }}
          onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}
          style={{ cursor: 'ew-resize' }}>
          {y.ticks(5).map(t => (
            <g key={t}>
              <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint font-mono text-[10px]">{pct(t, 0)}</text>
            </g>
          ))}
          {[0.05, 0.10, 0.15, 0.20, 0.25].map(t => (
            <text key={t} x={x(t)} y={H - m.b + 16} textAnchor="middle" className="fill-faint font-mono text-[10px]">{pct(t, 0)}</text>
          ))}
          <text x={width - m.r} y={H - 2} textAnchor="end" className="fill-faint text-[10.5px]">Volatility →</text>

          {/* guides to the axes for the selected portfolio */}
          <motion.line initial={false} animate={{ x1: x(p.vol), x2: x(p.vol), y1: y(p.ret), y2: H - m.b }} transition={{ duration: dragging.current ? 0 : .25 }}
            className="stroke-graphite" strokeDasharray="2 3" strokeWidth={1} />
          <motion.line initial={false} animate={{ x1: m.l, x2: x(p.vol), y1: y(p.ret), y2: y(p.ret) }} transition={{ duration: dragging.current ? 0 : .25 }}
            className="stroke-graphite" strokeDasharray="2 3" strokeWidth={1} />

          <motion.path d={path} fill="none" className="stroke-teal" strokeWidth={2.25} strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }} animate={inView || reduce ? { pathLength: 1 } : undefined} transition={{ duration: 1.1, ease: [.25, 1, .5, 1] }} />

          {UNIVERSE.map(a => {
            const L = LABEL[a.id];
            return (
              <g key={a.id}>
                <circle cx={x(a.vol)} cy={y(a.ret)} r={4} className="fill-card stroke-graphite-2" strokeWidth={1.5} />
                <text x={x(a.vol) + L.dx} y={y(a.ret) + L.dy} textAnchor={L.anchor} className="fill-muted text-[11px]">{width < 420 ? a.short : a.name}</text>
              </g>
            );
          })}

          <motion.circle initial={false} animate={{ cx: x(p.vol), cy: y(p.ret) }} transition={{ duration: dragging.current ? 0 : .25, ease: [.25, 1, .5, 1] }}
            r={7.5} className="fill-ink stroke-page" strokeWidth={3} />
        </svg>
        <div className="absolute left-[44px] top-0 font-mono text-[10px] uppercase tracking-[.12em] text-faint">Return ↑</div>
      </div>

      <label className="block">
        <span className="sr-only">Position on the efficient frontier, from lowest risk to highest return</span>
        <input type="range" min={0} max={F.length - 1} step={1} value={idx} aria-valuetext={valueText}
          onChange={e => { setIdx(+e.target.value); setDrawn(true); }}
          className="frontier-range w-full" style={{ ['--fill' as string]: `${(idx / (F.length - 1)) * 100}%` }} />
        <span className="mt-1 flex justify-between font-mono text-[10.5px] uppercase tracking-[.12em] text-faint" aria-hidden="true"><span>Lowest risk</span><span>Highest return</span></span>
      </label>

      <div>
        <div className="mb-2.5 flex items-center gap-5 text-[12px] text-muted">
          <span className="inline-flex items-center gap-2"><i className="h-1.5 w-4 rounded-full bg-teal" />Share of capital</span>
          <span className="inline-flex items-center gap-2"><i className="h-1.5 w-4 rounded-full bg-sand" />Share of risk</span>
        </div>
        <ul className="grid gap-2" aria-label="Allocation and risk contribution by asset class">
          {UNIVERSE.map((a, i) => (
            <li key={a.id} className="grid grid-cols-[92px_minmax(0,1fr)_76px] items-center gap-3 sm:grid-cols-[112px_minmax(0,1fr)_84px]">
              <span className="truncate text-[12.5px] text-ink">{width < 420 ? a.short : a.name}</span>
              <span className="grid gap-[3px]" aria-hidden="true">
                <Bar v={p.w[i]} cls="bg-teal" />
                <Bar v={p.rc[i]} cls="bg-sand" />
              </span>
              <span className="num text-right font-mono text-[11.5px] leading-tight">
                <span className="text-ink">{pct(p.w[i], 0)}</span><span className="text-faint"> / </span><span className="text-sand-ink">{pct(p.rc[i], 0)}</span>
                <span className="sr-only"> of capital, {pct(p.rc[i], 0)} of risk</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[13.5px] leading-relaxed text-muted">Move along the frontier: more return costs more risk; the bars show where the risk comes from.</p>

      <Disclosure title="Assumptions and method" hint="illustrative long-run figures">
        <div className="space-y-4 text-[13px] leading-relaxed text-muted">
          <p>Long-run annual assumptions for five asset classes. They are plausible round numbers chosen for illustration, and private equity volatility is desmoothed because reported valuations understate how much it moves.</p>
          <div className="overflow-x-auto">
            <table className="num w-full min-w-[420px] border-collapse font-mono text-[11.5px]">
              <thead>
                <tr className="text-faint">
                  <th className="py-1.5 pr-3 text-left font-normal">Asset class</th>
                  <th className="px-2 text-right font-normal">Return</th>
                  <th className="px-2 text-right font-normal">Vol</th>
                  {UNIVERSE.map(a => <th key={a.id} className="px-1.5 text-right font-normal" title={a.name}>{a.id.toUpperCase()}</th>)}
                </tr>
              </thead>
              <tbody>
                {UNIVERSE.map((a, i) => (
                  <tr key={a.id} className="border-t border-line text-ink">
                    <td className="py-1.5 pr-3 font-sans text-[12px]">{a.name} <span className="text-faint">({a.id.toUpperCase()})</span></td>
                    <td className="px-2 text-right">{pct(a.ret)}</td>
                    <td className="px-2 text-right">{pct(a.vol)}</td>
                    {CORR[i].map((c, j) => <td key={j} className={`px-1.5 text-right ${i === j ? 'text-faint' : ''}`}>{c.toFixed(2)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Each point on the curve is the lowest-variance fully invested, long-only portfolio for its expected return, solved exactly in the browser: for every subset of assets the constrained problem has a closed-form solution, and the best solution with no negative weights is kept. Risk shares are Euler contributions, weight times marginal risk divided by total variance, so they add to 100%.</p>
        </div>
      </Disclosure>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">{label}</div>
      <div className="num mt-1 text-[26px] font-semibold leading-none tracking-tight text-ink">{value}</div>
    </div>
  );
}

function Bar({ v, cls }: { v: number; cls: string }) {
  return (
    <span className="relative block h-[6px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--c-text)_7%,transparent)]">
      <motion.span className={`absolute inset-y-0 left-0 w-full origin-left rounded-full ${cls}`} initial={false} animate={{ scaleX: Math.max(v, 0) }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }} />
    </span>
  );
}
