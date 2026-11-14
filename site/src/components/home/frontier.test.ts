import { describe, expect, it } from 'vitest';
import { covariance, frontier, minVariance, riskShares, point } from './frontier';
import { UNIVERSE, CORR } from '@/data/home';

const MU = UNIVERSE.map(a => a.ret), VOL = UNIVERSE.map(a => a.vol), S = covariance(VOL, CORR);
const F = frontier(MU, S, 61);
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

/* brute-force check: no long-only portfolio on a fine grid with at least the target return has lower risk than the solver */
function gridMinVar(target?: number, step = 0.02) {
  let best = Infinity; const n = MU.length;
  const rec = (k: number, left: number, w: number[]) => {
    if (k === n - 1) { const ww = [...w, left]; const p = point(MU, S, ww); if (target === undefined || p.ret >= target - 1e-12) best = Math.min(best, p.vol); return; }
    for (let x = 0; x <= left + 1e-9; x += step) rec(k + 1, Math.round((left - x) * 1e6) / 1e6, [...w, x]);
  };
  rec(0, 1, []);
  return best;
}

describe('efficient frontier', () => {
  it('inputs are a valid correlation matrix', () => {
    for (let i = 0; i < CORR.length; i++) {
      expect(CORR[i][i]).toBe(1);
      for (let j = 0; j < CORR.length; j++) { expect(CORR[i][j]).toBe(CORR[j][i]); expect(Math.abs(CORR[i][j])).toBeLessThanOrEqual(1); }
    }
    expect(minVariance(MU, S)).not.toBeNull();
  });
  it('every point is fully invested, long only, with risk shares summing to 100%', () => {
    expect(F.length).toBeGreaterThan(50);
    for (const p of F) {
      expect(sum(p.w)).toBeCloseTo(1, 9);
      for (const w of p.w) expect(w).toBeGreaterThanOrEqual(0);
      expect(sum(p.rc)).toBeCloseTo(1, 9);
    }
  });
  it('return and risk both rise along the curve, ending at the highest-return asset', () => {
    for (let i = 1; i < F.length; i++) { expect(F[i].ret).toBeGreaterThan(F[i - 1].ret); expect(F[i].vol).toBeGreaterThan(F[i - 1].vol - 1e-12); }
    expect(F[F.length - 1].ret).toBeCloseTo(Math.max(...MU), 9);
  });
  it('the minimum-variance point and an interior point match a brute-force search', () => {
    expect(F[0].vol).toBeLessThanOrEqual(gridMinVar() + 1e-9);
    expect(gridMinVar() - F[0].vol).toBeLessThan(0.002);
    const mid = F[30];
    expect(mid.vol).toBeLessThanOrEqual(gridMinVar(mid.ret, 0.01) + 1e-9);
  });
  it('risk shares match a finite-difference Euler decomposition', () => {
    const w = F[20].w, v0 = point(MU, S, w).vol, h = 1e-6;
    const rc = riskShares(S, w);
    w.forEach((wi, i) => { const w2 = w.slice(); w2[i] += h; const d = (point(MU, S, w2).vol - v0) / h; expect(wi * d / v0).toBeCloseTo(rc[i], 5); });
  });
});
