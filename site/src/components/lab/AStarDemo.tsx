import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from 'react';
import { Tabs } from '@/components/ui';
import { cssVar, useThemeTick } from '@/lib/theme';

type Algo = 'astar' | 'dijkstra';
interface Result { order: number[]; path: number[]; cost: number; found: boolean }
interface Grid { cols: number; rows: number; walls: Uint8Array; start: number; goal: number }

const SQRT2 = Math.SQRT2;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* A* on an 8-connected grid with the octile heuristic, the same planner family Nav2 uses on its costmap.
   With h = 0 it is Dijkstra's algorithm. Diagonal moves may not cut a wall corner. */
function search(g: Grid, algo: Algo): Result {
  const { cols, rows, walls, start, goal } = g;
  const n = cols * rows;
  const gs = new Float64Array(n).fill(Infinity), came = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  const gx = goal % cols, gy = (goal / cols) | 0;
  const h = (i: number) => {
    if (algo === 'dijkstra') return 0;
    const dx = Math.abs(i % cols - gx), dy = Math.abs(((i / cols) | 0) - gy);
    return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
  };
  /* binary heap keyed on f, ties broken toward the larger g (closer to the goal) */
  const heap: [number, number, number][] = [];
  const push = (e: [number, number, number]) => {
    heap.push(e); let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (less(heap[i], heap[p])) { [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } else break; }
  };
  const less = (a: [number, number, number], b: [number, number, number]) => a[0] < b[0] - 1e-9 || (Math.abs(a[0] - b[0]) <= 1e-9 && a[1] > b[1]);
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; }
    }
    return top;
  };
  gs[start] = 0; push([h(start), 0, start]);
  const order: number[] = [];
  while (heap.length) {
    const [, gc, i] = pop();
    if (closed[i] || gc > gs[i] + 1e-9) continue;
    closed[i] = 1; order.push(i);
    if (i === goal) break;
    const x = i % cols, y = (i / cols) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = ny * cols + nx;
      if (walls[j] || closed[j]) continue;
      if (dx && dy && (walls[y * cols + nx] || walls[ny * cols + x])) continue;
      const ng = gc + (dx && dy ? SQRT2 : 1);
      if (ng < gs[j] - 1e-9) { gs[j] = ng; came[j] = i; push([ng + h(j), ng, j]); }
    }
  }
  const found = closed[goal] === 1;
  const path: number[] = [];
  if (found) for (let c = goal; c !== -1; c = came[c]) path.unshift(c);
  return { order, path, cost: found ? gs[goal] : 0, found };
}

function makeGrid(cols: number, rows: number): Grid {
  const walls = new Uint8Array(cols * rows);
  const set = (x: number, y: number) => { if (x >= 0 && y >= 0 && x < cols && y < rows) walls[y * cols + x] = 1; };
  /* a cup-shaped wall facing the start, so the search has to work its way around */
  const cx = Math.round(cols * .58), top = Math.round(rows * .2), bot = Math.round(rows * .8);
  for (let y = top; y <= bot; y++) set(cx, y);
  for (let x = cx - Math.max(2, Math.round(cols * .18)); x <= cx; x++) { set(x, top); set(x, bot); }
  const sy = Math.round(rows / 2);
  return { cols, rows, walls, start: sy * cols + Math.max(1, Math.round(cols * .14)), goal: sy * cols + Math.min(cols - 2, Math.round(cols * .86)) };
}

function dims(w: number) {
  if (w >= 900) return { cols: 40, rows: 18 };
  if (w >= 600) return { cols: 28, rows: 16 };
  return { cols: 16, rows: 15 };
}

export function AStarDemo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [algo, setAlgo] = useState<Algo>('astar');
  const [result, setResult] = useState<Result | null>(null);
  const [compare, setCompare] = useState<{ astar: number; dijkstra: number } | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const anim = useRef({ shown: 0, pathShown: 0, raf: 0 });
  const drag = useRef<{ mode: 'wall' | 'erase' | 'start' | 'goal'; last: number } | null>(null);
  const autoRan = useRef(false);
  const theme = useThemeTick();

  /* size the grid from the container; rebuild only when the column count changes */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const d = width ? dims(width) : null;
  useEffect(() => {
    if (!d) return;
    setGrid(g => (g && g.cols === d.cols && g.rows === d.rows ? g : makeGrid(d.cols, d.rows)));
    setResult(null); setCompare(null);
  }, [d?.cols, d?.rows]);

  const cell = grid && width ? Math.floor(width / grid.cols) : 0;
  /* the frame loop reads the latest state from here, never from a stale closure */
  const st = useRef({ grid, result, cell, focused, cursor });
  st.current = { ...st.current, grid, result, cell, focused, cursor };

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const { grid, result, cell, focused, cursor } = st.current;
    if (!cv || !grid || !cell) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = grid.cols * cell, H = grid.rows * cell;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
    const g = cv.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const col = { bg: cssVar('--c-card'), line: cssVar('--c-border'), wall: cssVar('--c-text-2'), teal: cssVar('--c-green'), sand: cssVar('--c-gold'), ink: cssVar('--c-text'), page: cssVar('--c-page') };
    g.fillStyle = col.bg; g.fillRect(0, 0, W, H);
    const { shown, pathShown } = anim.current;
    /* explored cells, newest brightest */
    if (result) {
      const k = Math.min(shown, result.order.length);
      for (let n = 0; n < k; n++) {
        const i = result.order[n];
        const age = k - n;
        g.globalAlpha = .16 + .3 * Math.max(0, 1 - age / 40);
        g.fillStyle = col.teal;
        g.fillRect((i % grid.cols) * cell, ((i / grid.cols) | 0) * cell, cell, cell);
      }
      g.globalAlpha = 1;
    }
    /* grid lines */
    g.strokeStyle = col.line; g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= grid.cols; x++) { g.moveTo(x * cell + .5, 0); g.lineTo(x * cell + .5, H); }
    for (let y = 0; y <= grid.rows; y++) { g.moveTo(0, y * cell + .5); g.lineTo(W, y * cell + .5); }
    g.stroke();
    /* walls */
    g.fillStyle = col.wall;
    for (let i = 0; i < grid.walls.length; i++) if (grid.walls[i]) g.fillRect((i % grid.cols) * cell + 1, ((i / grid.cols) | 0) * cell + 1, cell - 1, cell - 1);
    /* path */
    if (result?.found && pathShown > 0) {
      const n = Math.min(result.path.length, Math.ceil(pathShown));
      g.strokeStyle = col.sand; g.lineWidth = Math.max(2.5, cell * .22); g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      for (let k = 0; k < n; k++) {
        const i = result.path[k], cx = (i % grid.cols + .5) * cell, cy = (((i / grid.cols) | 0) + .5) * cell;
        if (k) g.lineTo(cx, cy); else g.moveTo(cx, cy);
      }
      g.stroke();
    }
    /* start and goal */
    const dot = (i: number, fill: string, ring: boolean) => {
      const cx = (i % grid.cols + .5) * cell, cy = (((i / grid.cols) | 0) + .5) * cell;
      g.beginPath(); g.arc(cx, cy, cell * .36, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
      if (ring) { g.lineWidth = 2; g.strokeStyle = col.page; g.stroke(); }
    };
    dot(grid.start, col.ink, true);
    dot(grid.goal, col.sand, true);
    { const i = grid.goal, cx = (i % grid.cols + .5) * cell, cy = (((i / grid.cols) | 0) + .5) * cell; g.beginPath(); g.arc(cx, cy, cell * .12, 0, Math.PI * 2); g.fillStyle = col.page; g.fill(); }
    /* keyboard cursor */
    if (focused && cursor !== null) {
      g.strokeStyle = col.teal; g.lineWidth = 2;
      g.strokeRect((cursor % grid.cols) * cell + 1.5, ((cursor / grid.cols) | 0) * cell + 1.5, cell - 3, cell - 3);
    }
  }, []);

  useEffect(() => { draw(); });
  useEffect(() => { draw(); }, [draw, theme]);

  const run = useCallback((animate: boolean, g: Grid | null = grid, a: Algo = algo) => {
    if (!g) return;
    const r = search(g, a);
    const other = search(g, a === 'astar' ? 'dijkstra' : 'astar');
    setCompare(a === 'astar' ? { astar: r.order.length, dijkstra: other.order.length } : { astar: other.order.length, dijkstra: r.order.length });
    cancelAnimationFrame(anim.current.raf);
    st.current.grid = g; st.current.result = r;
    if (!animate || reduced()) {
      anim.current.shown = Infinity; anim.current.pathShown = Infinity;
      setResult(r);
      return;
    }
    anim.current.shown = 0; anim.current.pathShown = 0;
    setResult(r);
    const step = Math.max(1, r.order.length / 75);
    const tick = () => {
      const a2 = anim.current;
      if (a2.shown < r.order.length) a2.shown += step;
      else a2.pathShown += Math.max(.6, r.path.length / 30);
      draw();
      if (a2.shown < r.order.length || a2.pathShown < r.path.length) a2.raf = requestAnimationFrame(tick);
    };
    anim.current.raf = requestAnimationFrame(tick);
  }, [grid, algo, draw]);

  useEffect(() => { const a = anim.current; return () => cancelAnimationFrame(a.raf); }, []);

  /* run once, animated, when the demo first scrolls into view */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !grid || autoRan.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !autoRan.current) { autoRan.current = true; run(true); io.disconnect(); }
    }, { threshold: .4 });
    io.observe(el);
    return () => io.disconnect();
  }, [grid, run]);

  /* editing the grid replans at once when a result is on screen */
  const edit = (next: Grid) => {
    st.current.grid = next;
    setGrid(next);
    if (st.current.result) run(false, next);
  };

  const cellAt = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!grid || !cell) return -1;
    const r = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / cell), y = Math.floor((e.clientY - r.top) / cell);
    if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return -1;
    return y * grid.cols + x;
  };
  const paint = (g: Grid, from: number, to: number, mode: 'wall' | 'erase') => {
    const walls = g.walls.slice();
    const x0 = from % g.cols, y0 = (from / g.cols) | 0, x1 = to % g.cols, y1 = (to / g.cols) | 0;
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const i = Math.round(y0 + (y1 - y0) * s / steps) * g.cols + Math.round(x0 + (x1 - x0) * s / steps);
      if (i !== g.start && i !== g.goal) walls[i] = mode === 'wall' ? 1 : 0;
    }
    return { ...g, walls };
  };
  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    const i = cellAt(e);
    if (i < 0 || !grid) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const mode = i === grid.start ? 'start' : i === grid.goal ? 'goal' : grid.walls[i] ? 'erase' : 'wall';
    drag.current = { mode, last: i };
    if (mode === 'wall' || mode === 'erase') edit(paint(grid, i, i, mode));
  };
  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const dr = drag.current, grid = st.current.grid;
    if (!dr || !grid) return;
    const i = cellAt(e);
    if (i < 0 || i === dr.last) return;
    if (dr.mode === 'start' || dr.mode === 'goal') {
      if (!grid.walls[i] && i !== (dr.mode === 'start' ? grid.goal : grid.start)) edit({ ...grid, [dr.mode]: i });
    } else edit(paint(grid, dr.last, i, dr.mode));
    dr.last = i;
  };
  const onUp = () => { drag.current = null; };

  const onKey = (e: RKeyboardEvent) => {
    if (!grid) return;
    const c = cursor ?? grid.start;
    const x = c % grid.cols, y = (c / grid.cols) | 0;
    const mv: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (mv[e.key]) {
      e.preventDefault();
      const nx = Math.min(grid.cols - 1, Math.max(0, x + mv[e.key][0])), ny = Math.min(grid.rows - 1, Math.max(0, y + mv[e.key][1]));
      setCursor(ny * grid.cols + nx);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (c !== grid.start && c !== grid.goal) edit(paint(grid, c, c, grid.walls[c] ? 'erase' : 'wall'));
    } else if (e.key.toLowerCase() === 's' && !grid.walls[c] && c !== grid.goal) edit({ ...grid, start: c });
    else if (e.key.toLowerCase() === 'g' && !grid.walls[c] && c !== grid.start) edit({ ...grid, goal: c });
    else if (e.key.toLowerCase() === 'f') run(true);
  };

  const randomWalls = () => {
    if (!grid) return;
    const walls = new Uint8Array(grid.walls.length);
    for (let i = 0; i < walls.length; i++) if (i !== grid.start && i !== grid.goal && Math.random() < .27) walls[i] = 1;
    edit({ ...grid, walls });
  };
  const clearWalls = () => { if (grid) { setResult(null); setCompare(null); cancelAnimationFrame(anim.current.raf); setGrid({ ...grid, walls: new Uint8Array(grid.walls.length) }); } };
  const switchAlgo = (a: Algo) => { setAlgo(a); if (result) run(true, grid, a); };

  const saved = compare && compare.dijkstra > 0 ? Math.round((1 - compare.astar / compare.dijkstra) * 100) : 0;

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="self-start"><Tabs label="Search algorithm" value={algo} onChange={switchAlgo} tabs={[{ id: 'astar', label: 'A*' }, { id: 'dijkstra', label: 'Dijkstra' }]} /></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => run(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-btn px-4 text-[13.5px] sm:px-5 font-medium text-btn-ink transition-shadow hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--c-btn)_18%,transparent)]">
            <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden="true"><path d="M3 1.5v9l7-4.5z" /></svg>Find path
          </button>
          <button type="button" onClick={randomWalls} className="min-h-10 rounded-full px-3.5 text-[13.5px] text-ink ring-1 ring-inset ring-line-strong transition-shadow hover:ring-teal">Random walls</button>
          <button type="button" onClick={clearWalls} className="min-h-10 rounded-full px-3 text-[13.5px] text-muted transition-colors hover:bg-panel hover:text-ink">Clear</button>
        </div>
      </div>

      <div className="p-3 sm:p-5">
        <div ref={wrapRef} className="w-full">
          <canvas ref={canvasRef} tabIndex={0} role="application" aria-roledescription="path-finding grid"
            aria-label="Grid for the path-finding demo. Arrow keys move the cursor, Space toggles a wall, S places the start, G places the goal, F finds the path."
            aria-describedby="astar-status"
            className="mx-auto block touch-none cursor-crosshair rounded-lg"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            onKeyDown={onKey} onFocus={() => { setFocused(true); if (cursor === null && grid) setCursor(grid.start); }} onBlur={() => setFocused(false)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-line p-5 sm:grid-cols-[auto_auto_1fr] sm:items-center sm:gap-8 sm:p-6">
        <div>
          <div className="num font-mono text-[1.4rem] font-semibold text-ink">{result ? result.order.length : '–'}</div>
          <div className="text-[12.5px] text-muted">cells explored</div>
        </div>
        <div>
          <div className="num font-mono text-[1.4rem] font-semibold text-ink">{result ? (result.found ? result.cost.toFixed(1) : 'none') : '–'}</div>
          <div className="text-[12.5px] text-muted">path length, in cells</div>
        </div>
        <p id="astar-status" className="col-span-2 text-[13.5px] sm:col-span-1 leading-relaxed text-muted" aria-live="polite">
          {!result ? 'Draw walls by dragging across the grid, move the start or goal by dragging them, then find the path.'
            : !result.found ? 'The goal is walled off, so no path exists. Clear a gap and the planner finds one at once.'
            : compare ? `For the same shortest path, A* explored ${compare.astar} cells and Dijkstra’s search ${compare.dijkstra}${saved > 0 ? `, so the estimate saved ${saved}% of the work.` : '.'}` : ''}
        </p>
      </div>
    </div>
  );
}
