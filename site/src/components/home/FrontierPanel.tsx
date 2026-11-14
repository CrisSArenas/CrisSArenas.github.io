import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, animate } from 'motion/react';
import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { Disclosure } from '@/components/ui';
import { UNIVERSE, CORR, CAPS, GROUP_LABEL, type AssetGroup } from '@/data/home';
import POINTS from '@/data/frontier-points.json';
import type { FrontierPoint } from './frontier';
import { useWidth, prefersReducedMotion } from './useSize';

const MU = UNIVERSE.map(a => a.ret);
const VOL = UNIVERSE.map(a => a.vol);
/* the frontier is solved exactly at build time with the position caps (scripts/frontier-points.ts) */
const F: FrontierPoint[] = POINTS.points;
/* start near a balanced institutional mix, about 10% volatility */
const START = F.reduce((b, q, i) => (Math.abs(q.vol - 0.10) < Math.abs(F[b].vol - 0.10) ? i : b), 0);
const pct = (v: number, d = 1) => (v * 100).toFixed(d) + '%';
const GROUPS: AssetGroup[] = ['growth', 'credit', 'defensive', 'real', 'alternatives'];
const IDX_BY_GROUP = GROUPS.map(g => UNIVERSE.map((a, i) => (a.group === g ? i : -1)).filter(i => i >= 0));

/* chart labels: full names when there is room, short codes on narrow screens */
const LABEL: Record<string, [string, string]> = {
  useq: ['US equities', 'US'], intl: ['Intl developed', 'Intl'], em: ['Emerging', 'EM'], gov: ['Treasuries', 'Gov'], ig: ['IG credit', 'IG'],
  hy: ['High yield', 'HY'], pe: ['Private equity', 'PE'], re: ['Real estate', 'RE'], hf: ['Hedge funds', 'HF']
};
type Box = { x0: number; y0: number; x1: number; y1: number };
type Placed = { id: string; t: string; x: number; y: number; anchor: 'start' | 'middle' | 'end' };
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/* place each label beside its dot where it covers no other dot, no other label and keeps clear of the curve, where the
   selected portfolio travels; candidates are tried in order and the one with the least overlap wins */
function placeLabels(dots: { id: string; cx: number; cy: number }[], curve: [number, number][], bounds: Box, short: boolean): Placed[] {
  const charW = short ? 6.2 : 5.75, h = 11, gap = 7;
  const dotBoxes = dots.map(d => ({ x0: d.cx - 5, y0: d.cy - 5, x1: d.cx + 5, y1: d.cy + 5 }));
  const curveBoxes = curve.map(([cx, cy]) => ({ x0: cx - 10, y0: cy - 10, x1: cx + 10, y1: cy + 10 }));
  const placed: (Placed & { box: Box })[] = [];
  for (const d of dots) {
    const t = LABEL[d.id][short ? 1 : 0], w = t.length * charW;
    const cands: [number, number, Placed['anchor']][] = [
      [gap, 4, 'start'], [-gap, 4, 'end'], [gap - 2, 14, 'start'], [-gap + 2, 14, 'end'], [gap - 2, -7, 'start'], [-gap + 2, -7, 'end'], [0, 17, 'middle'], [0, -9, 'middle']
    ];
    let best: (Placed & { box: Box }) | null = null, bestCost = Infinity;
    cands.forEach(([dx, dy, anchor], rank) => {
      const lx = d.cx + dx, ly = d.cy + dy;
      const x0 = anchor === 'start' ? lx : anchor === 'end' ? lx - w : lx - w / 2;
      const box = { x0, y0: ly - h + 2, x1: x0 + w, y1: ly + 2 };
      let cost = rank * 0.5;
      const out = Math.max(0, bounds.x0 - box.x0) + Math.max(0, box.x1 - bounds.x1) + Math.max(0, bounds.y0 - box.y0) + Math.max(0, box.y1 - bounds.y1);
      cost += out * 400;
      dotBoxes.forEach(b => { cost += overlap(box, b) * 40; });
      placed.forEach(q => { cost += overlap(box, q.box) * 40; });
      curveBoxes.forEach(b => { cost += overlap(box, b) * 2; });
      if (cost < bestCost) { bestCost = cost; best = { id: d.id, t, x: lx, y: ly, anchor, box }; }
    });
    placed.push(best!);
  }
  return placed;
}

export function FrontierPanel() {
  const [idx, setIdx] = useState(() => (prefersReducedMotion() ? START : 2));
  const reduce = useReducedMotion();
  const [wrapRef, width] = useWidth<HTMLDivElement>(480);
  const inView = useInView(wrapRef, { once: true, margin: '0px 0px -15% 0px' });
  const [drawn, setDrawn] = useState(false);
  const dragging = useRef(false);

  /* a short sweep up the frontier on first view, so the curve reads as something you can move along */
  useEffect(() => {
    if (!inView || drawn) return;
    if (reduce) { setDrawn(true); return; }
    const c = animate(2, START, { duration: 1.4, delay: .5, ease: [.25, 1, .5, 1], onUpdate: v => setIdx(Math.round(v)), onComplete: () => setDrawn(true) });
    return () => c.stop();
  }, [inView, reduce, drawn]);

  const H = width < 420 ? 220 : 252;
  const m = { t: 14, r: 14, b: 34, l: 40 };
  /* axes fit the assets with a margin, rounded to whole percent */
  const x = scaleLinear().domain([Math.floor(Math.min(...VOL, F[0].vol) * 100 - 1) / 100, Math.ceil(Math.max(...VOL) * 100 + 1) / 100]).range([m.l, width - m.r]);
  const y = scaleLinear().domain([Math.floor(Math.min(...MU) * 100 - .5) / 100, Math.ceil(Math.max(...MU) * 100 + .8) / 100]).range([H - m.b, m.t]);
  const path = line<{ vol: number; ret: number }>().x(d => x(d.vol)).y(d => y(d.ret)).curve(curveMonotoneX)(F) || '';
  const p = F[idx];
  const labels = useMemo(() => {
    const dots = UNIVERSE.map(a => ({ id: a.id, cx: x(a.vol), cy: y(a.ret) }));
    const curve: [number, number][] = F.map(q => [x(q.vol), y(q.ret)]);
    return placeLabels(dots, curve, { x0: m.l - 4, y0: m.t - 6, x1: width - m.r + 4, y1: H - m.b - 2 }, width < 420);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, H]);

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
        <div className="pb-1 text-right font-mono text-[11px] uppercase tracking-[.12em] text-faint">{holds} of {UNIVERSE.length}<br className="sm:hidden" /> held</div>
      </div>

      <div ref={wrapRef} className="relative">
        <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} className="block touch-pan-y select-none overflow-visible"
          role="img" aria-label={`Long-only efficient frontier for nine asset classes, with private equity capped at 20%, real estate, hedge funds and emerging markets at 15%. Selected portfolio: ${valueText}.`}
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
          {x.ticks(5).map(t => (
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

          {UNIVERSE.map(a => <circle key={a.id} cx={x(a.vol)} cy={y(a.ret)} r={3.5} className="fill-card stroke-graphite-2" strokeWidth={1.5} />)}
          {labels.map(l => <text key={l.id} x={l.x} y={l.y} textAnchor={l.anchor} className="pointer-events-none fill-muted text-[10.5px]">{l.t}</text>)}

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
        <ul className="grid gap-2" aria-label="Allocation and risk contribution by role in the portfolio">
          {GROUPS.map((g, gi) => {
            const w = IDX_BY_GROUP[gi].reduce((t, i) => t + p.w[i], 0), rc = IDX_BY_GROUP[gi].reduce((t, i) => t + p.rc[i], 0);
            return <Row key={g} name={GROUP_LABEL[g]} sub={IDX_BY_GROUP[gi].map(i => UNIVERSE[i].short).join(', ')} w={w} rc={rc} />;
          })}
        </ul>
      </div>

      <p className="text-[13.5px] leading-relaxed text-muted">Move along the frontier: more return costs more risk; the bars show where the risk comes from.</p>

      <Disclosure title="By asset class">
        <ul className="grid gap-2" aria-label="Allocation and risk contribution by asset class">
          {UNIVERSE.map((a, i) => <Row key={a.id} name={a.short} sub={CAPS[i] < 1 ? `Up to ${pct(CAPS[i], 0)}` : undefined} w={p.w[i]} rc={p.rc[i]} />)}
        </ul>
      </Disclosure>

      <Disclosure title="Inputs and method">
        <div className="space-y-4 text-[13px] leading-relaxed text-muted">
          <p>Annualised expected return and volatility for nine asset classes, and how they move together. Private equity and real estate risk are desmoothed, because reported valuations understate how much they move.</p>
          <table className="num w-full border-collapse font-mono text-[11.5px]">
            <thead><tr className="text-faint"><th className="py-1.5 pr-2 text-left font-sans font-normal">Asset class</th><th className="px-1 text-right font-normal">Return</th><th className="px-1 text-right font-normal">Vol</th><th className="pl-1 text-right font-normal">Cap</th></tr></thead>
            <tbody>
              {UNIVERSE.map((a, i) => (
                <tr key={a.id} className="border-t border-line text-ink">
                  <td className="py-1.5 pr-2 font-sans text-[12px]">{a.short}</td>
                  <td className="px-1 text-right">{pct(a.ret)}</td>
                  <td className="px-1 text-right">{pct(a.vol)}</td>
                  <td className="pl-1 text-right text-faint">{CAPS[i] < 1 ? pct(CAPS[i], 0) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <CorrMap />
          <p>Each point on the curve is the lowest-risk fully invested, long-only portfolio for its expected return, with every asset class held between zero and its cap. It is solved exactly: at the optimum each asset is at zero, at its cap or in between, and for every such split the problem has a closed-form solution; the best feasible one is kept. Risk shares are Euler contributions, weight times marginal risk divided by total variance, so they add to 100%.</p>
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

function Row({ name, sub, w, rc }: { name: string; sub?: string; w: number; rc: number }) {
  return (
    <li className="grid grid-cols-[104px_minmax(0,1fr)_76px] items-center gap-3 sm:grid-cols-[124px_minmax(0,1fr)_84px]">
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] text-ink">{name}</span>
        {sub && <span className="block truncate text-[10.5px] text-faint">{sub}</span>}
      </span>
      <span className="grid gap-[3px]" aria-hidden="true">
        <Bar v={w} cls="bg-teal" />
        <Bar v={rc} cls="bg-sand" />
      </span>
      <span className="num text-right font-mono text-[11.5px] leading-tight">
        <span className="text-ink">{pct(w, 0)}</span><span className="text-faint"> / </span><span className="text-sand-ink">{pct(rc, 0)}</span>
        <span className="sr-only"> of capital, {pct(rc, 0)} of risk</span>
      </span>
    </li>
  );
}

/* correlation matrix as a compact heatmap: teal for positive, sand for negative, darker for stronger */
function CorrMap() {
  const n = UNIVERSE.length, c = 22, L = 92, W = L + n * c, H = n * c + 18;
  const code: Record<string, string> = { useq: 'US', intl: 'Intl', em: 'EM', gov: 'Gov', ig: 'IG', hy: 'HY', pe: 'PE', re: 'RE', hf: 'HF' };
  return (
    <figure className="m-0 pb-1">
      <figcaption className="mb-2 text-[12px] text-faint">Correlation between asset classes</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full max-w-[340px]" role="img"
        aria-label={'Correlations: ' + UNIVERSE.map((a, i) => UNIVERSE.slice(i + 1).map((b, j) => `${a.short} and ${b.short} ${CORR[i][i + 1 + j].toFixed(2)}`).join(', ')).join(', ')}>
        {UNIVERSE.map((a, j) => <text key={a.id} x={L + j * c + c / 2} y={10} textAnchor="middle" className="fill-faint font-mono text-[8.5px]">{code[a.id]}</text>)}
        {UNIVERSE.map((a, i) => (
          <g key={a.id}>
            <text x={L - 6} y={18 + i * c + c / 2 + 3} textAnchor="end" className="fill-muted text-[9.5px]">{a.short}</text>
            {CORR[i].map((v, j) => (
              <rect key={j} x={L + j * c + 1} y={18 + i * c + 1} width={c - 2} height={c - 2} rx={3}
                fill={v >= 0 ? 'var(--c-green)' : 'var(--c-gold)'} fillOpacity={i === j ? 0.12 : Math.max(0.06, Math.abs(v))}>
                <title>{`${a.short} and ${UNIVERSE[j].short}: ${v.toFixed(2)}`}</title>
              </rect>
            ))}
          </g>
        ))}
      </svg>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-faint" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-teal" />Move together, darker is stronger</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-sand" />Move apart</span>
      </p>
    </figure>
  );
}
