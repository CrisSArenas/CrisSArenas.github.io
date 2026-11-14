/* Long-only mean-variance efficient frontier, solved exactly.
   With n assets, the optimum for a target return lies on one face of the simplex (the set of assets it holds).
   On that face the problem is an equality-constrained quadratic program with a closed-form solution, so we solve it
   for every non-empty subset of assets, keep the solutions with no negative weight, and take the lowest variance.
   For five assets that is 31 small linear solves per point. */

export interface FrontierPoint { ret: number; vol: number; w: number[]; rc: number[] }

export function covariance(vol: number[], corr: number[][]): number[][] {
  return vol.map((vi, i) => vol.map((vj, j) => vi * vj * corr[i][j]));
}

/* Gaussian elimination with partial pivoting; null when singular */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

const quad = (S: number[][], w: number[]) => w.reduce((s, wi, i) => s + wi * S[i].reduce((t, sij, j) => t + sij * w[j], 0), 0);

/* minimum variance on the simplex, optionally at a target return */
export function minVariance(mu: number[], S: number[][], target?: number): number[] | null {
  const n = mu.length;
  let best: number[] | null = null, bestV = Infinity;
  for (let mask = 1; mask < 1 << n; mask++) {
    const idx = [...Array(n).keys()].filter(i => mask & (1 << i));
    const k = idx.length, withRet = target !== undefined, m = k + (withRet ? 2 : 1);
    const A = Array.from({ length: m }, () => Array(m).fill(0)), b = Array(m).fill(0);
    idx.forEach((i, a) => {
      idx.forEach((j, c) => { A[a][c] = 2 * S[i][j]; });
      A[a][k] = 1; A[k][a] = 1;
      if (withRet) { A[a][k + 1] = mu[i]; A[k + 1][a] = mu[i]; }
    });
    b[k] = 1;
    if (withRet) b[k + 1] = target!;
    let x: number[] | null;
    if (k === 1) x = withRet && Math.abs(mu[idx[0]] - target!) > 1e-9 ? null : [1];
    else x = solve(A, b);
    if (!x) continue;
    const ws = x.slice(0, k);
    if (ws.some(v => v < -1e-10)) continue;
    const w = Array(n).fill(0);
    idx.forEach((i, a) => { w[i] = Math.max(0, ws[a]); });
    const v = quad(S, w);
    if (v < bestV - 1e-14) { bestV = v; best = w; }
  }
  return best;
}

/* Euler risk contributions: w_i (S w)_i / w'Sw, which sum to one */
export function riskShares(S: number[][], w: number[]): number[] {
  const Sw = S.map(r => r.reduce((t, sij, j) => t + sij * w[j], 0));
  const v = w.reduce((s, wi, i) => s + wi * Sw[i], 0);
  return w.map((wi, i) => (v > 0 ? (wi * Sw[i]) / v : 0));
}

export function point(mu: number[], S: number[][], w: number[]): FrontierPoint {
  return { w, ret: w.reduce((s, wi, i) => s + wi * mu[i], 0), vol: Math.sqrt(quad(S, w)), rc: riskShares(S, w) };
}

/* frontier from the minimum-variance portfolio to the highest-return asset, evenly spaced in target return */
export function frontier(mu: number[], S: number[][], steps = 61): FrontierPoint[] {
  const w0 = minVariance(mu, S)!;
  const r0 = w0.reduce((s, wi, i) => s + wi * mu[i], 0), r1 = Math.max(...mu);
  const out: FrontierPoint[] = [];
  for (let s = 0; s < steps; s++) {
    const t = r0 + ((r1 - r0) * s) / (steps - 1);
    const w = s === 0 ? w0 : minVariance(mu, S, t);
    if (w) out.push(point(mu, S, w));
  }
  return out;
}
