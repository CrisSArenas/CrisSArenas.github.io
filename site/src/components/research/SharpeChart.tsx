import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { select, scaleLinear, easeCubicOut } from 'd3';
import { Tabs, Disclosure } from '@/components/ui';
import { cssVar, useThemeTick } from '@/lib/theme';
import { METHODS, SHARPE, DGPS, DGP_READING, GROUP_LABEL, type Dgp, type MethodGroup } from '@/data/research';

const X_MIN = -0.9, X_MAX = 1.7, TICKS = [-0.5, 0, 0.5, 1, 1.5];
const GROUPS: MethodGroup[] = ['card', 'neural', 'trad'];
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);

interface Tip { x: number; y: number; id: string }

/* Sharpe ratio by method with ±1 standard deviation across seeds, switchable between the three
   data-generating processes. Rows are fixed; bars, whiskers and labels animate between processes. */
export function SharpeChart() {
  const [dgp, setDgp] = useState<Dgp>('A');
  const [width, setWidth] = useState(720);
  const [tip, setTip] = useState<Tip | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const first = useRef(true);
  const theme = useThemeTick();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 560;
  const ROW = narrow ? 30 : 34, HEAD = 26, GAP = 14;
  const M = useMemo(() => ({ l: narrow ? 88 : 136, r: narrow ? 38 : 56, t: 6, b: 44 }), [narrow]);
  /* row positions, with a small group header above each group */
  const { layout, heads, H } = useMemo(() => {
    const layout: { id: string; group: MethodGroup; y: number }[] = [];
    const heads: { group: MethodGroup; y: number }[] = [];
    let y = M.t;
    GROUPS.forEach((g, gi) => {
      if (gi) y += GAP;
      heads.push({ group: g, y: y + 16 });
      y += HEAD;
      METHODS.filter(m => m.group === g).forEach(m => { layout.push({ id: m.id, group: g, y: y + ROW / 2 }); y += ROW; });
    });
    return { layout, heads, H: y + M.b };
  }, [M, ROW]);
  const xs = useMemo(() => scaleLinear().domain([X_MIN, X_MAX]).range([M.l, width - M.r]), [M, width]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width < 10) return;
    const data = SHARPE[dgp];
    const x = xs;
    const c = {
      card: cssVar('--c-green'), neural: `color-mix(in srgb, ${cssVar('--c-green')} 45%, ${cssVar('--c-card')})`, trad: cssVar('--c-graphite-2'),
      ink: cssVar('--c-text'), muted: cssVar('--c-text-2'), faint: cssVar('--c-text-3'), grid: cssVar('--c-border'), axis: cssVar('--c-chip-border')
    };
    const animate = !first.current && !reduced();
    first.current = false;
    const dur = animate ? 700 : 0;
    const s = select(svg);
    const bh = narrow ? 12 : 14;
    const plotTop = M.t, plotBottom = H - M.b;

    /* grid and axis */
    s.select<SVGGElement>('g.grid').selectAll<SVGGElement, number>('g.tick').data(TICKS).join(enter => {
      const g = enter.append('g').attr('class', 'tick');
      g.append('line'); g.append('text');
      return g;
    }).each(function (v) {
      const g = select(this);
      g.select('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', plotTop).attr('y2', plotBottom)
        .attr('stroke', v === 0 ? c.axis : c.grid).attr('stroke-width', v === 0 ? 1.4 : 1).attr('stroke-dasharray', v === 0 ? null : '2 4');
      g.select('text').attr('x', x(v)).attr('y', plotBottom + 18).attr('text-anchor', 'middle').attr('fill', c.faint)
        .attr('font-size', 11).attr('font-family', 'var(--font-mono)').text(v.toFixed(1));
    });
    s.select('text.x-title').attr('x', M.l + (width - M.l - M.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle')
      .attr('fill', c.muted).attr('font-size', 11.5).text('Sharpe ratio, annualized, out of sample');

    /* group headers */
    s.select<SVGGElement>('g.heads').selectAll<SVGTextElement, { group: MethodGroup; y: number }>('text').data(heads).join('text')
      .attr('x', 0).attr('y', d => d.y).attr('fill', d => (d.group === 'card' ? c.card : c.faint)).attr('font-size', 10.5)
      .attr('font-family', 'var(--font-mono)').attr('letter-spacing', '.12em').text(d => GROUP_LABEL[d.group].toUpperCase());
    s.select<SVGGElement>('g.dividers').selectAll<SVGLineElement, { y: number }>('line').data(heads.slice(1)).join('line')
      .attr('x1', 0).attr('x2', width - M.r).attr('y1', d => d.y - 16 - GAP / 2).attr('y2', d => d.y - 16 - GAP / 2)
      .attr('stroke', c.grid);

    /* rows */
    const rows = s.select<SVGGElement>('g.rows').selectAll<SVGGElement, (typeof layout)[number]>('g.row').data(layout, d => d.id)
      .join(enter => {
        const g = enter.append('g').attr('class', 'row');
        g.append('rect').attr('class', 'hit');
        g.append('text').attr('class', 'name');
        g.append('rect').attr('class', 'bar');
        g.append('line').attr('class', 'wh');
        g.append('line').attr('class', 'c0');
        g.append('line').attr('class', 'c1');
        g.append('text').attr('class', 'val');
        g.select('rect.bar').attr('x', x(0)).attr('width', 0);
        return g;
      });
    rows.select('rect.hit').attr('x', 0).attr('y', d => d.y - ROW / 2).attr('width', width).attr('height', ROW).attr('fill', 'transparent');
    rows.select('text.name').attr('x', M.l - 12).attr('y', d => d.y + 4).attr('text-anchor', 'end').attr('fill', c.ink)
      .attr('font-size', narrow ? 12 : 13).attr('font-weight', d => (d.group === 'card' ? 600 : 400)).text(d => d.id);
    rows.select('rect.bar').attr('y', d => d.y - bh / 2).attr('height', bh).attr('rx', 3).attr('fill', d => c[d.group])
      .transition().duration(dur).ease(easeCubicOut)
      .attr('x', d => x(Math.min(0, data[d.id][0])))
      .attr('width', d => Math.max(1.5, Math.abs(x(data[d.id][0]) - x(0))));
    const whisk = (sel: string, x1: (d: (typeof layout)[number]) => number, x2: (d: (typeof layout)[number]) => number, dy: number) =>
      rows.select(sel).attr('stroke', c.ink).attr('stroke-opacity', .55).attr('stroke-width', 1.2)
        .transition().duration(dur).ease(easeCubicOut)
        .attr('x1', x1).attr('x2', x2).attr('y1', d => d.y - dy).attr('y2', d => d.y + dy);
    whisk('line.wh', d => x(data[d.id][0] - data[d.id][1]), d => x(data[d.id][0] + data[d.id][1]), 0);
    whisk('line.c0', d => x(data[d.id][0] - data[d.id][1]), d => x(data[d.id][0] - data[d.id][1]), 4.5);
    whisk('line.c1', d => x(data[d.id][0] + data[d.id][1]), d => x(data[d.id][0] + data[d.id][1]), 4.5);
    rows.select('text.val').attr('y', d => d.y + 4).attr('font-size', 11.5).attr('font-family', 'var(--font-mono)')
      .attr('fill', d => (d.group === 'card' ? c.ink : c.muted)).attr('font-weight', d => (d.group === 'card' ? 600 : 400))
      .text(d => fmt(data[d.id][0]))
      .transition().duration(dur).ease(easeCubicOut)
      .attr('x', d => x(Math.max(0, data[d.id][0] + data[d.id][1])) + 7);
  }, [dgp, width, theme, narrow, H, M, ROW, heads, layout, xs]);

  const show = (id: string) => {
    const row = layout.find(r => r.id === id);
    if (!row) return;
    const [m, sd] = SHARPE[dgp][id];
    const half = Math.min(130, width / 2);
    setTip({ id, x: Math.min(Math.max(xs(Math.max(0, m + sd)), half), width - half), y: row.y - ROW / 2 });
  };
  const tipM = tip ? METHODS.find(m => m.id === tip.id) : undefined;
  const tipD = tip ? SHARPE[dgp][tip.id] : undefined;
  const dg = DGPS.find(d => d.id === dgp)!;

  return (
    <figure className="surface relative px-4 py-5 sm:p-8" aria-labelledby="sharpe-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <div className="eyebrow mb-3">Main result</div>
          <h3 id="sharpe-title" className="text-[1.35rem] font-semibold tracking-tight text-ink">Sharpe ratio by method</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">Return per unit of risk on the 120 test months no model had seen. The bar is the mean over three random seeds; the whisker spans one standard deviation either side.</p>
        </div>
        <Tabs label="Data-generating process" value={dgp} onChange={v => { setDgp(v); setTip(null); }}
          tabs={DGPS.map(d => ({ id: d.id, label: d.label }))} />
      </div>

      <div ref={wrapRef} className="relative mt-8" onPointerLeave={() => setTip(null)}>
        <svg ref={svgRef} width={width} height={H} className="block overflow-visible" role="group"
          aria-label={`Sharpe ratio by method on the ${dg.label.toLowerCase()} process. Each row can be focused to read its value.`}>
          <g className="grid" aria-hidden="true" />
          <g className="dividers" aria-hidden="true" />
          <g className="heads" aria-hidden="true" />
          <text className="x-title" aria-hidden="true" />
          <g className="rows">
            {/* rows are created by D3; React only wires focus and pointer handlers through delegation below */}
          </g>
        </svg>
        <RowA11y layout={layout} dgp={dgp} rowH={ROW} width={width} onShow={show} onHide={() => setTip(null)} active={tip?.id} />
        <AnimatePresence>
          {tip && tipM && tipD && (
            <motion.div key="tip" role="status" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}
              className="pointer-events-none absolute z-10 w-[min(260px,100%)] -translate-x-1/2 -translate-y-full rounded-xl border border-line-strong bg-card px-4 py-3 shadow-[0_12px_32px_var(--c-shade-2)]"
              style={{ left: tip.x, top: tip.y - 6 }}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] font-semibold text-ink">{tipM.id}</span>
                <span className="num font-mono text-[13px] text-ink">{fmt(tipD[0])} <span className="text-faint">± {tipD[1].toFixed(2)}</span></span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{tipM.plain}.</p>
              <p className="mt-1.5 font-mono text-[11px] text-faint">{dg.short} {dg.label.toLowerCase()} · 3 seeds</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-muted" aria-hidden="true">
        {GROUPS.map(g => (
          <span key={g} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-[3px]" style={{ background: g === 'card' ? 'var(--c-green)' : g === 'neural' ? 'color-mix(in srgb, var(--c-green) 45%, var(--c-card))' : 'var(--c-graphite-2)' }} />
            {GROUP_LABEL[g]}
          </span>
        ))}
        <span className="inline-flex items-center gap-2"><span className="relative h-2.5 w-4"><span className="absolute inset-x-0 top-1/2 h-px bg-ink/60" /><span className="absolute left-0 top-0 h-full w-px bg-ink/60" /><span className="absolute right-0 top-0 h-full w-px bg-ink/60" /></span>±1 standard deviation</span>
      </div>

      <figcaption className="mt-6 grid gap-4 border-t border-line pt-6 md:grid-cols-[1fr_1.3fr]">
        <p className="text-[13px] leading-relaxed text-faint"><span className="font-mono text-[11px] uppercase tracking-[.12em] text-teal">{dg.short}</span><br />{dg.plain}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={dgp} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .25 }}
            className="text-[14.5px] leading-relaxed text-ink" aria-live="polite">{DGP_READING[dgp]} The whiskers overlap heavily, and none of the differences between the neural models is statistically significant.</motion.p>
        </AnimatePresence>
      </figcaption>

      <div className="mt-6">
        <Disclosure title="The numbers behind the chart" hint="Table 2 of the paper">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[480px] text-[13px]">
              <caption className="sr-only">Mean Sharpe ratio and standard deviation across three seeds, by method and data-generating process</caption>
              <thead>
                <tr className="text-left font-mono text-[11px] uppercase tracking-[.1em] text-faint">
                  <th scope="col" className="py-2 pr-4 font-normal">Method</th>
                  {DGPS.map(d => <th key={d.id} scope="col" className="py-2 pl-4 text-right font-normal">{d.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {METHODS.map(m => (
                  <tr key={m.id} className="border-t border-line">
                    <th scope="row" className={`py-2 pr-4 text-left ${m.group === 'card' ? 'font-semibold text-ink' : 'font-normal text-muted'}`}>{m.id}</th>
                    {DGPS.map(d => <td key={d.id} className="num py-2 pl-4 text-right font-mono text-ink">{fmt(SHARPE[d.id][m.id][0])} <span className="text-faint">± {SHARPE[d.id][m.id][1].toFixed(2)}</span></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      </div>
    </figure>
  );
}

/* Invisible focusable buttons laid over each row, so the chart works by keyboard, mouse and touch alike. */
function RowA11y({ layout, dgp, rowH, width, onShow, onHide, active }: {
  layout: { id: string; y: number }[]; dgp: Dgp; rowH: number; width: number; active?: string;
  onShow: (id: string) => void; onHide: () => void;
}) {
  const dg = DGPS.find(d => d.id === dgp)!;
  return (
    <div className="absolute inset-0" style={{ width }}>
      {layout.map(r => {
        const [m, sd] = SHARPE[dgp][r.id];
        return (
          <button key={r.id} type="button"
            aria-label={`${r.id}: Sharpe ratio ${fmt(m)}, plus or minus ${sd.toFixed(2)}, ${dg.label} process`}
            className={`absolute left-0 w-full cursor-default rounded-lg transition-colors focus-visible:outline-offset-0 ${active === r.id ? 'bg-[color-mix(in_srgb,var(--c-text)_4%,transparent)]' : 'hover:bg-[color-mix(in_srgb,var(--c-text)_3%,transparent)]'}`}
            style={{ top: r.y - rowH / 2, height: rowH }}
            onPointerEnter={e => { if (e.pointerType === 'mouse') onShow(r.id); }}
            onClick={() => onShow(r.id)}
            onFocus={() => onShow(r.id)} onBlur={onHide}
            onKeyDown={e => { if (e.key === 'Escape') onHide(); }} />
        );
      })}
    </div>
  );
}
