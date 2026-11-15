import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, useReducedMotion, animate } from 'motion/react';
import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { Disclosure } from '@/components/ui';
import { UNIVERSE, CORR, CAPS, CASH, MARKET_RETURN, POLICY, SIGMA, INFLATION, REAL_OBJECTIVE, SPENDING, ILLIQUID_MAX, LIQUID_MIN } from '@/data/home';
import POINTS from '@/data/frontier-points.json';
import { point, type FrontierPoint } from './frontier';
import { useWidth, prefersReducedMotion } from './useSize';

const MU = UNIVERSE.map(a => a.ret);
const VOL = UNIVERSE.map(a => a.vol);
/* the frontier is solved exactly at build time with the position caps (scripts/frontier-points.ts) */
const F: FrontierPoint[] = POINTS.points;
/* the curve passes through the market portfolio (expected returns are implied from it); the panel opens there */
const MARKET = POINTS.market;
const START = MARKET;
/* the endowment-style policy portfolio, and the best mix on the curve with the same risk (interpolated) */
const POL = point(MU, SIGMA, POLICY.map(l => l.target));
const ILLIQUID = UNIVERSE.reduce((t, a, i) => t + (a.id === 'pe' || a.id === 're' ? POL.w[i] : 0), 0);
const SAME_RISK_RET = (() => {
  const k = F.findIndex(q => q.vol >= POL.vol);
  const a = F[k - 1], b = F[k];
  return a.ret + ((POL.vol - a.vol) / (b.vol - a.vol)) * (b.ret - a.ret);
})();
/* a rough 1-in-20 bad year: expected return less 1.645 volatilities (normal approximation) */
const badYear = (q: { ret: number; vol: number }) => q.ret - 1.645 * q.vol;
/* rounds away negative zero, so a tiny hedge shows 0% rather than -0% */
const pct = (v: number, d = 1) => { const t = (v * 100).toFixed(d); return (Number(t) === 0 ? (0).toFixed(d) : t).replace('-', '\u2212') + '%'; };
/* whole percent, for the bad-year figure */
const signed = (v: number) => pct(v, 0);

/* chart labels: full names when there is room, short codes on narrow screens */
const LABEL: Record<string, [string, string]> = {
  useq: ['US equities', 'US'], intl: ['Intl developed', 'Intl'], em: ['Emerging', 'EM'], gov: ['Treasuries', 'Gov'], ig: ['IG credit', 'IG'],
  hy: ['High yield', 'HY'], pe: ['Private equity', 'PE'], re: ['Real estate', 'RE'], hf: ['Hedge funds', 'HF'], mkt: ['Market portfolio', 'Market'], pol: ['Policy portfolio', 'Policy']
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
  const [view, setView] = useState<'frontier' | 'policy'>('frontier');
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

  const H = width < 420 ? 210 : 230;
  const m = { t: 14, r: 14, b: 34, l: 40 };
  /* axes fit the assets with a margin, rounded to whole percent */
  const x = scaleLinear().domain([Math.floor(Math.min(...VOL, F[0].vol) * 100 - 1) / 100, Math.ceil(Math.max(...VOL) * 100 + 1) / 100]).range([m.l, width - m.r]);
  const y = scaleLinear().domain([Math.floor(Math.min(...MU) * 100 - .5) / 100, Math.ceil(Math.max(...MU) * 100 + .8) / 100]).range([H - m.b, m.t]);
  const path = line<{ vol: number; ret: number }>().x(d => x(d.vol)).y(d => y(d.ret)).curve(curveMonotoneX)(F) || '';
  const policy = view === 'policy';
  const p = policy ? POL : F[idx];
  const labels = useMemo(() => {
    const dots = [{ id: 'mkt', cx: x(F[MARKET].vol), cy: y(F[MARKET].ret) }, { id: 'pol', cx: x(POL.vol), cy: y(POL.ret) }, ...UNIVERSE.map(a => ({ id: a.id, cx: x(a.vol), cy: y(a.ret) }))];
    const curve: [number, number][] = F.map(q => [x(q.vol), y(q.ret)]);
    return placeLabels(dots, curve, { x0: m.l - 4, y0: m.t - 6, x1: width - m.r + 4, y1: H - m.b - 2 }, width < 420);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, H]);

  const pick = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const v = x.invert(clientX - r.left);
    let best = 0;
    F.forEach((q, i) => { if (Math.abs(q.vol - v) < Math.abs(F[best].vol - v)) best = i; });
    setIdx(best); setDrawn(true); setView('frontier');
  };

  const holds = p.w.filter(w => w > 0.005).length;
  const valueText = `${policy ? 'Policy portfolio' : 'Selected portfolio'}: expected return ${pct(p.ret)} a year, volatility ${pct(p.vol)}, a 1-in-20 bad year about ${signed(badYear(p))}`;
  const pe = UNIVERSE.findIndex(a => a.id === 'pe');

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <Readout label={<><span className="sm:hidden">Return</span><span className="hidden sm:inline">Expected return</span></>} note="Average per year" value={pct(p.ret)} />
        <Readout label="Volatility" note="Typical yearly swing" value={pct(p.vol)} />
        <Readout label="Bad year" note="About 1 in 20 years" value={signed(badYear(p))} />
      </div>

      <div ref={wrapRef} className="relative mt-1">
        <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} className="block touch-pan-y select-none overflow-visible"
          role="img" aria-label={`Long-only efficient frontier for nine asset classes with market-implied expected returns, private equity capped at 20%, and real estate, hedge funds and emerging markets at 15%. A ring marks the market portfolio and a diamond the endowment policy portfolio. ${valueText}.`}
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
          <text x={width - m.r} y={H - 2} textAnchor="end" className="fill-faint text-[10.5px]">Volatility per year →</text>

          {/* guides to the axes for the selected portfolio */}
          <motion.line initial={false} animate={{ x1: x(p.vol), x2: x(p.vol), y1: y(p.ret), y2: H - m.b }} transition={{ duration: dragging.current ? 0 : .25 }}
            className="stroke-graphite" strokeDasharray="2 3" strokeWidth={1} />
          <motion.line initial={false} animate={{ x1: m.l, x2: x(p.vol), y1: y(p.ret), y2: y(p.ret) }} transition={{ duration: dragging.current ? 0 : .25 }}
            className="stroke-graphite" strokeDasharray="2 3" strokeWidth={1} />

          <motion.path d={path} fill="none" className="stroke-teal" strokeWidth={2.25} strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }} animate={inView || reduce ? { pathLength: 1 } : undefined} transition={{ duration: 1.1, ease: [.25, 1, .5, 1] }} />

          <circle cx={x(F[MARKET].vol)} cy={y(F[MARKET].ret)} r={5.5} fill="none" className="stroke-sand" strokeWidth={1.75} />
          {UNIVERSE.map(a => <circle key={a.id} cx={x(a.vol)} cy={y(a.ret)} r={3.5} className="fill-card stroke-graphite-2" strokeWidth={1.5} />)}
          <Diamond cx={x(POL.vol)} cy={y(POL.ret)} active={policy} />
          {labels.map(l => <text key={l.id} x={l.x} y={l.y} textAnchor={l.anchor} className={`pointer-events-none text-[10.5px] ${l.id === 'pol' && policy ? 'fill-ink font-medium' : 'fill-muted'}`}>{l.t}</text>)}

          {!policy && <motion.circle initial={false} animate={{ cx: x(p.vol), cy: y(p.ret) }} transition={{ duration: dragging.current ? 0 : .25, ease: [.25, 1, .5, 1] }}
            r={7.5} className="fill-ink stroke-page" strokeWidth={3} />}
        </svg>
        <div className="absolute left-[44px] top-0 font-mono text-[10px] uppercase tracking-[.12em] text-faint">Expected return per year ↑</div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-faint" aria-label="Chart key">
        <li className="inline-flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" className="fill-card stroke-graphite-2" strokeWidth="1.5" /></svg>Asset class held alone</li>
        <li className="inline-flex items-center gap-1.5"><i className="h-[2px] w-4 rounded-full bg-teal" aria-hidden="true" />Best mix for each level of risk</li>
        <li className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" className="stroke-sand" strokeWidth="1.5" /></svg>Market portfolio</li>
        <li className="inline-flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><path d="M6 1.5 10.5 6 6 10.5 1.5 6Z" className="fill-card stroke-ink" strokeWidth="1.4" /></svg>Policy portfolio</li>
      </ul>

      <label className={`block transition-opacity ${policy ? 'opacity-60' : ''}`}>
        <span className="sr-only">Position on the efficient frontier, from lowest risk to highest return</span>
        <input type="range" min={0} max={F.length - 1} step={1} value={idx} aria-valuetext={valueText}
          onChange={e => { setIdx(+e.target.value); setDrawn(true); setView('frontier'); }}
          className="frontier-range w-full" style={{ ['--fill' as string]: `${(idx / (F.length - 1)) * 100}%` }} />
        <span className="mt-1 flex justify-between font-mono text-[10.5px] uppercase tracking-[.12em] text-faint" aria-hidden="true"><span>Lowest risk</span><span>Highest return</span></span>
      </label>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Portfolio shown in the bars" className="inline-flex gap-1 rounded-full bg-panel p-1 ring-1 ring-line">
          {([['frontier', 'Frontier mix'], ['policy', 'Policy portfolio']] as const).map(([id, l]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${view === id ? 'bg-card text-ink ring-1 ring-line-strong' : 'text-muted hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[.12em] text-faint">Holds {holds} of {UNIVERSE.length}</span>
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between gap-4 text-[12px] text-muted">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-2"><i className="h-1.5 w-4 rounded-full bg-teal" />Capital</span>
            <span className="inline-flex items-center gap-2"><i className="h-1.5 w-4 rounded-full bg-sand" />Risk contribution</span>
            {policy
              ? <span className="inline-flex items-center gap-2"><i className="h-2.5 w-4 rounded-[3px] border border-[color-mix(in_srgb,var(--c-text)_55%,transparent)]" />Policy range</span>
              : <span className="inline-flex items-center gap-2"><i className="h-3 w-[2px] rounded-full bg-ink" />Policy target</span>}
          </span>
          <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[.1em] text-faint">Capital / Risk</span>
        </div>
        <ul className="grid gap-1" aria-label={`Capital and risk contribution by asset class, ${policy ? 'policy portfolio' : 'selected frontier mix'}`}>
          {UNIVERSE.map((a, i) => (
            <Row key={a.id} name={a.short} sub={policy ? `Range ${pct(POLICY[i].min, 0)} to ${pct(POLICY[i].max, 0)}` : CAPS[i] < 1 ? `Max ${pct(CAPS[i], 0)}` : undefined}
              w={p.w[i]} rc={p.rc[i]} target={policy ? undefined : POLICY[i].target} range={policy ? [POLICY[i].min, POLICY[i].max] : undefined} />
          ))}
        </ul>
      </div>

      <p className="text-[13.5px] leading-relaxed text-muted">
        {policy
          ? <>The policy portfolio sets a target and an allowed range for each asset class, the way an endowment&rsquo;s investment policy does. Private equity is {pct(POL.w[pe], 0)} of the capital but {pct(POL.rc[pe], 0)} of the risk.</>
          : <>The curve opens at the market portfolio, which holds all nine. Move along it: more return costs more risk. Risk contribution is each asset class&rsquo;s share of the portfolio&rsquo;s ups and downs; Treasuries can show 0% or less because they tend to rise when stocks fall.</>}
      </p>

      <Disclosure title="Investment policy">
        <div className="space-y-4 text-[13px] leading-relaxed text-muted">
          <p>A policy portfolio in the style of an endowment&rsquo;s investment policy statement: a target and an allowed range for each asset class, inside the same caps as the curve.</p>
          <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-[110px_minmax(0,1fr)]">
            <dt className="text-ink">Objective</dt><dd>Inflation plus {pct(REAL_OBJECTIVE, 0)} a year over rolling 10-year periods, about {pct(INFLATION + REAL_OBJECTIVE)} today.</dd>
            <dt className="text-ink">Spending</dt><dd>{pct(SPENDING, 0)} a year of the average value over the last 12 quarters.</dd>
            <dt className="text-ink">Rebalancing</dt><dd>Reviewed every quarter; any asset class outside its range goes back to target.</dd>
            <dt className="text-ink">Liquidity</dt><dd>At least {pct(LIQUID_MIN, 0)} can be sold within a week; private equity and real estate together stay at or below {pct(ILLIQUID_MAX, 0)}.</dd>
          </dl>
          <table className="num w-full border-collapse font-mono text-[10.5px] sm:text-[11.5px]">
            <thead><tr className="text-faint"><th className="py-1.5 pr-2 text-left font-sans font-normal">Asset class and role</th><th className="px-1 text-right font-normal">Target</th><th className="pl-1 text-right font-normal">Range</th></tr></thead>
            <tbody>
              {UNIVERSE.map((a, i) => (
                <tr key={a.id} className="border-t border-line text-ink">
                  <td className="py-1.5 pr-2 font-sans"><span className="block text-[11.5px] sm:text-[12px]">{a.short}</span><span className="block text-[10.5px] text-faint">{POLICY[i].role}</span></td>
                  <td className="px-1 text-right align-top pt-2">{pct(POLICY[i].target, 0)}</td>
                  <td className="whitespace-nowrap pl-1 pt-2 text-right align-top">{pct(POLICY[i].min, 0)} to {pct(POLICY[i].max, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Expected return {pct(POL.ret)} a year on average, about {pct(POL.ret - POL.vol ** 2 / 2)} compounded; volatility {pct(POL.vol)}; a 1-in-20 bad year about {signed(badYear(POL))}. Private equity and real estate together are {pct(ILLIQUID, 0)} of the portfolio.</p>
          <p>Against the curve, the best mix with the same risk earns {pct(SAME_RISK_RET, 2)}, {pct(SAME_RISK_RET - POL.ret, 2)} more, a gap smaller than the uncertainty in any assumption. The policy&rsquo;s compound return of about {pct(POL.ret - POL.vol ** 2 / 2)} is just short of the {pct(INFLATION + REAL_OBJECTIVE)} objective, which is why endowments lean towards equity and private assets.</p>
        </div>
      </Disclosure>

      <Disclosure title="Inputs and method">
        <div className="space-y-4 text-[13px] leading-relaxed text-muted">
          <p>Expected returns are market implied. Start from a typical global multi-asset portfolio, the market weights below, and ask what returns would make holding exactly that portfolio the best choice, given each asset class&rsquo;s risk and how the classes move together. Each class is paid only for the market risk it carries, over cash at {pct(CASH, 0)}, scaled so the market portfolio earns {pct(MARKET_RETURN)} a year on average, about {pct(MARKET_RETURN - F[MARKET].vol ** 2 / 2)} compounded.</p>
          <table className="num w-full border-collapse font-mono text-[10.5px] sm:text-[11.5px]">
            <thead><tr className="align-bottom text-faint"><th className="py-1.5 pr-2 text-left font-sans font-normal">Asset class</th><th className="px-1 text-right font-normal">Expected</th><th className="px-1 text-right font-normal">1995&ndash;2024 avg</th><th className="px-1 text-right font-normal">Volatility</th><th className="px-1 text-right font-normal">Market weight</th><th className="hidden pl-1 text-right font-normal sm:table-cell">Cap</th></tr></thead>
            <tbody>
              {UNIVERSE.map((a, i) => (
                <tr key={a.id} className="border-t border-line text-ink">
                  <td className="whitespace-nowrap py-1.5 pr-2 font-sans text-[11.5px] sm:text-[12px]">{a.short}</td>
                  <td className="px-1 text-right">{pct(a.ret)}</td>
                  <td className="px-1 text-right text-faint">{pct(a.hist)}</td>
                  <td className="px-1 text-right">{pct(a.vol)}</td>
                  <td className="px-1 text-right">{pct(a.mkt, 0)}</td>
                  <td className="hidden pl-1 text-right text-faint sm:table-cell">{CAPS[i] < 1 ? pct(CAPS[i], 0) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Risk comes from 30 years of annual history, 1995 to 2024. Private equity and real estate are desmoothed, because reported valuations understate how much they move. History sets the risk but not the returns: 30-year average returns are too noisy to optimise on, about &plusmn;3% a year for US equities alone, and an optimiser treats every such difference as real. The 30-year averages are shown for reference.</p>
          <CorrMap />
          <p>Each point on the curve is the lowest-risk fully invested, long-only portfolio for its expected return, with every asset class held between zero and its cap. It is solved exactly: at the optimum each asset is at zero, at its cap or in between, and for every such split the problem has a closed-form solution; the best feasible one is kept. Risk contributions are Euler contributions, weight times marginal risk divided by total variance, so they add to 100%. At the market portfolio&rsquo;s expected return the solver recovers the market weights exactly. The bad year is the expected return less 1.645 volatilities, a normal approximation; real markets have fatter tails.</p>
        </div>
      </Disclosure>
    </div>
  );
}

function Readout({ label, note, value }: { label: ReactNode; note?: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-mono text-[10.5px] uppercase tracking-[.12em] text-faint">{label}</div>
      <div className="num mt-1 text-[23px] font-semibold leading-none tracking-tight text-ink sm:text-[26px]">{value}</div>
      {note && <div className="mt-1.5 text-[11px] leading-snug text-faint">{note}</div>}
    </div>
  );
}

/* the policy portfolio's marker; filled when it is the portfolio shown */
function Diamond({ cx, cy, active }: { cx: number; cy: number; active: boolean }) {
  const r = active ? 7 : 5.5;
  return <path d={`M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy}Z`} className={active ? 'fill-ink stroke-page' : 'fill-card stroke-ink'} strokeWidth={active ? 2.5 : 1.5} />;
}

function Bar({ v, cls, target, range }: { v: number; cls: string; target?: number; range?: [number, number] }) {
  return (
    <span className="relative block">
      <span className="relative block h-[6px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--c-text)_7%,transparent)]">
        <motion.span className={`absolute inset-y-0 left-0 w-full origin-left rounded-full ${cls}`} initial={false} animate={{ scaleX: Math.max(v, 0) }}
          transition={{ type: 'spring', stiffness: 260, damping: 32 }} />
      </span>
      {range && <span className="absolute -top-[3px] h-3 rounded-[3px] border border-[color-mix(in_srgb,var(--c-text)_55%,transparent)]" style={{ left: `${range[0] * 100}%`, width: `${(range[1] - range[0]) * 100}%` }} />}
      {target !== undefined && <span className="absolute -top-[3px] h-3 w-[2px] -translate-x-1/2 rounded-full bg-ink" style={{ left: `${target * 100}%` }} />}
    </span>
  );
}

function Row({ name, sub, w, rc, target, range }: { name: string; sub?: string; w: number; rc: number; target?: number; range?: [number, number] }) {
  return (
    <li className="grid grid-cols-[112px_minmax(0,1fr)_72px] items-center gap-3 sm:grid-cols-[124px_minmax(0,1fr)_84px]">
      <span className="min-w-0">
        <span className="block truncate text-[12px] leading-snug text-ink sm:text-[12.5px]">{name}</span>
        {sub && <span className="block truncate text-[10.5px] leading-tight text-faint">{sub}</span>}
      </span>
      <span className="grid gap-[3px]" aria-hidden="true">
        <Bar v={w} cls="bg-teal" target={target} range={range} />
        <Bar v={rc} cls="bg-sand" />
      </span>
      <span className="num text-right font-mono text-[11.5px] leading-tight">
        <span className="text-ink">{pct(w, 0)}</span><span className="text-faint"> / </span><span className="text-sand-ink">{pct(rc, 0)}</span>
        <span className="sr-only"> of capital, {pct(rc, 0)} of risk{target !== undefined ? `, policy target ${pct(target, 0)}` : ''}{range ? `, policy range ${pct(range[0], 0)} to ${pct(range[1], 0)}` : ''}</span>
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
