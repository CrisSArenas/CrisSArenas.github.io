/* Long-only mean-variance efficient frontier with position caps, solved exactly.
   At the optimum every asset is either at zero, at its cap, or free in between. For a given split the problem is an
   equality-constrained quadratic program in the free assets (budget and target return), with a closed-form solution.
   We solve every split, keep those whose free weights stay inside [0, cap], and take the lowest variance. Uncapped
   assets have two states and capped assets three, so nine assets with four caps need 2^5 x 3^4 = 2,592 small solves
   per point. The frontier is computed once at build time (scripts/frontier-points.ts) and shipped as data. */

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

export const quad = (S: number[][], w: number[]) => w.reduce((s, wi, i) => s + wi * S[i].reduce((t, sij, j) => t + sij * w[j], 0), 0);

/* minimum variance with 0 <= w_i <= cap_i and sum w = 1, optionally at a target return; caps default to 1 */
export function minVariance(mu: number[], S: number[][], target?: number, caps?: number[]): number[] | null {
  const n = mu.length, ub = caps ?? mu.map(() => 1), withRet = target !== undefined;
  const states = ub.map(c => (c < 1 ? 3 : 2));
  const total = states.reduce((a, b) => a * b, 1);
  let best: number[] | null = null, bestV = Infinity;
  const st = new Array(n).fill(0);
  for (let code = 0; code < total; code++) {
    let x = code;
    for (let i = 0; i < n; i++) { st[i] = x % states[i]; x = Math.floor(x / states[i]); }
    /* st: 0 at zero, 1 free, 2 at cap */
    const free: number[] = [], w = new Array(n).fill(0);
    let fixedSum = 0, fixedRet = 0;
    for (let i = 0; i < n; i++) {
      if (st[i] === 1) free.push(i);
      else if (st[i] === 2) { w[i] = ub[i]; fixedSum += ub[i]; fixedRet += ub[i] * mu[i]; }
    }
    const needSum = 1 - fixedSum, needRet = withRet ? target! - fixedRet : 0;
    const k = free.length;
    if (k === 0) {
      if (Math.abs(needSum) > 1e-9 || (withRet && Math.abs(needRet) > 1e-9)) continue;
    } else {
      /* KKT: 2 S_ff w_f + S_fc-terms + lambda 1 + gamma mu = 0, 1'w_f = needSum, mu'w_f = needRet */
      const m = k + (withRet ? 2 : 1);
      const A = Array.from({ length: m }, () => new Array(m).fill(0)), b = new Array(m).fill(0);
      free.forEach((i, a) => {
        free.forEach((j, c) => { A[a][c] = 2 * S[i][j]; });
        let cross = 0;
        for (let j = 0; j < n; j++) if (st[j] === 2) cross += 2 * S[i][j] * ub[j];
        b[a] = -cross;
        A[a][k] = 1; A[k][a] = 1;
        if (withRet) { A[a][k + 1] = mu[i]; A[k + 1][a] = mu[i]; }
      });
      b[k] = needSum;
      if (withRet) b[k + 1] = needRet;
      let sol: number[] | null;
      if (k === 1 && withRet) {
        /* one free asset: both equalities must agree */
        const wi = needSum;
        sol = Math.abs(mu[free[0]] * wi - needRet) < 1e-9 ? [wi] : null;
      } else sol = solve(A, b);
      if (!sol) continue;
      let ok = true;
      for (let a = 0; a < k; a++) { const v = sol[a]; if (v < -1e-10 || v > ub[free[a]] + 1e-10) { ok = false; break; } w[free[a]] = Math.min(ub[free[a]], Math.max(0, v)); }
      if (!ok) continue;
    }
    const v = quad(S, w);
    if (v < bestV - 1e-14) { bestV = v; best = w.slice(); }
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

/* highest expected return reachable under the caps: fill the best assets up to their caps */
export function maxReturn(mu: number[], caps?: number[]): number {
  const ub = caps ?? mu.map(() => 1);
  const order = mu.map((_m, i) => i).sort((a, b) => mu[b] - mu[a]);
  let left = 1, r = 0;
  for (const i of order) { const t = Math.min(left, ub[i]); r += t * mu[i]; left -= t; if (left <= 1e-12) break; }
  return r;
}

/* frontier from the minimum-variance portfolio to the highest-return portfolio, evenly spaced in target return */
export function frontier(mu: number[], S: number[][], steps = 61, caps?: number[]): FrontierPoint[] {
  const w0 = minVariance(mu, S, undefined, caps)!;
  const r0 = w0.reduce((s, wi, i) => s + wi * mu[i], 0), r1 = maxReturn(mu, caps);
  const out: FrontierPoint[] = [];
  for (let s = 0; s < steps; s++) {
    const t = r0 + ((r1 - r0) * s) / (steps - 1);
    const w = s === 0 ? w0 : minVariance(mu, S, t, caps);
    if (w) out.push(point(mu, S, w));
  }
  return out;
}
