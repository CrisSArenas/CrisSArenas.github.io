import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SHARPE, METHODS } from '@/data/research';
import { search, type Grid } from '@/components/lab/AStarDemo';

/* Illustrations for the Research and Engineering Lab cards, in the same panel style as the project previews.
   Both draw real content: the paper's Sharpe ratios, and a path the Lab's own A* search finds. */

const frame = 'relative overflow-hidden rounded-2xl border border-line bg-[var(--c-art)] dot-bg';

/* Sharpe ratio by method on the base data-generating process, mean of three seeds (Table 2 of the paper) */
export function ResearchArt() {
  const reduce = useReducedMotion();
  const rows = METHODS.map(m => ({ id: m.id, group: m.group, v: SHARPE.A[m.id][0] }));
  const max = 1.2, W = 520, H = 196, L = 104, top = 14, rh = (H - top - 18) / rows.length;
  const x = (v: number) => L + (Math.max(0, v) / max) * (W - L - 44);
  const fill = (g: string) => (g === 'card' ? 'var(--c-green)' : g === 'neural' ? 'color-mix(in srgb, var(--c-green) 45%, transparent)' : 'var(--c-gold)');
  return (
    <figure className={frame}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img"
        aria-label={'Sharpe ratio by method on the base market: ' + rows.map(r => `${r.id} ${r.v.toFixed(2)}`).join(', ')}>
        {[0, 0.5, 1].map(t => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top - 4} y2={H - 16} stroke="var(--c-border)" strokeDasharray="2 3" />
            <text x={x(t)} y={H - 4} textAnchor="middle" fontSize="9.5" fill="var(--c-text-3)" fontFamily="var(--font-mono)">{t.toFixed(1)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = top + i * rh;
          return (
            <g key={r.id}>
              <text x={L - 8} y={y + rh / 2 + 3.5} textAnchor="end" fontSize="10.5" fill={r.group === 'card' ? 'var(--c-text)' : 'var(--c-text-2)'} fontFamily="var(--font-mono)">{r.id}</text>
              <motion.rect x={L} y={y + rh * 0.2} height={rh * 0.6} rx={2} fill={fill(r.group)}
                initial={reduce ? false : { width: 0 }} whileInView={{ width: x(r.v) - L }} viewport={{ once: true }} transition={{ duration: .9, delay: .04 * i, ease: [.25, 1, .5, 1] }} />
              <text x={x(r.v) + 6} y={y + rh / 2 + 3.5} fontSize="10" fill="var(--c-text-2)" fontFamily="var(--font-mono)">{r.v.toFixed(2)}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[.1em] text-faint">
        <span>Sharpe ratio by method</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-teal" />This paper</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-teal/45" />Other neural</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-sand" />Traditional</span>
      </figcaption>
    </figure>
  );
}

/* a small warehouse grid; the route is whatever the Lab's A* search returns for it */
const COLS = 26, ROWS = 11;
function labGrid(): Grid {
  const walls = new Uint8Array(COLS * ROWS);
  const wall = (x0: number, y0: number, x1: number, y1: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) walls[y * COLS + x] = 1; };
  wall(6, 0, 7, 6); wall(13, 4, 14, 10); wall(19, 0, 20, 5); wall(9, 9, 11, 10); wall(22, 8, 25, 8);
  return { cols: COLS, rows: ROWS, walls, start: 9 * COLS + 2, goal: 2 * COLS + 23 };
}

export function LabArt() {
  const reduce = useReducedMotion();
  const { g, path, explored } = useMemo(() => { const g = labGrid(); const r = search(g, 'astar'); return { g, path: r.path, explored: new Set(r.order) }; }, []);
  const c = 14, W = COLS * c, H = ROWS * c;
  const pts = path.map(i => `${(i % COLS) * c + c / 2},${Math.floor(i / COLS) * c + c / 2}`).join(' ');
  return (
    <figure className={frame}>
      <svg viewBox={`-8 -8 ${W + 16} ${H + 16}`} className="block h-auto w-full" role="img"
        aria-label={`A robot route planned around obstacles by A* search: ${path.length - 1} moves, ${explored.size} cells explored`}>
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const x = (i % COLS) * c, y = Math.floor(i / COLS) * c;
          if (g.walls[i]) return <rect key={i} x={x + .5} y={y + .5} width={c - 1} height={c - 1} rx={1.5} fill="var(--c-graphite)" opacity=".55" />;
          if (explored.has(i)) return <rect key={i} x={x + 3} y={y + 3} width={c - 6} height={c - 6} rx={1.5} fill="var(--c-green)" opacity=".1" />;
          return null;
        })}
        <motion.polyline points={pts} fill="none" stroke="var(--c-green)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: [.25, 1, .5, 1] }} />
        <circle cx={(g.start % COLS) * c + c / 2} cy={Math.floor(g.start / COLS) * c + c / 2} r="5.5" fill="var(--c-page)" stroke="var(--c-green)" strokeWidth="2" />
        <circle cx={(g.goal % COLS) * c + c / 2} cy={Math.floor(g.goal / COLS) * c + c / 2} r="5.5" fill="var(--c-gold)" />
        <g transform={`translate(${W - 74}, ${H - 46})`} stroke="var(--c-text-3)" strokeWidth="1.2" fill="none" opacity=".85">
          <rect x="10" y="6" width="44" height="32" rx="4" fill="var(--c-card)" />
          {[0, 1, 2, 3].map(k => <g key={k}><line x1={18 + k * 9.5} x2={18 + k * 9.5} y1="0" y2="6" /><line x1={18 + k * 9.5} x2={18 + k * 9.5} y1="38" y2="44" /></g>)}
          <line x1="4" x2="10" y1="16" y2="16" /><line x1="4" x2="10" y1="28" y2="28" /><line x1="54" x2="60" y1="16" y2="16" /><line x1="54" x2="60" y1="28" y2="28" />
          <text x="32" y="25.5" textAnchor="middle" fontSize="8" fill="var(--c-text-2)" stroke="none" fontFamily="var(--font-mono)">MCU</text>
        </g>
      </svg>
      <figcaption className="border-t border-line px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[.1em] text-faint">A* route around obstacles · {path.length - 1} moves</figcaption>
    </figure>
  );
}
