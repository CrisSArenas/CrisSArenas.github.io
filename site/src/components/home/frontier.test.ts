import { describe, expect, it } from 'vitest';
import { covariance, frontier, impliedReturns, maxReturn, minVariance, riskShares, point } from './frontier';
import { UNIVERSE, CORR, CAPS, MARKET, CASH, MARKET_RETURN, RISK_AVERSION, POLICY, SIGMA, ILLIQUID_MAX } from '@/data/home';
import POINTS from '@/data/frontier-points.json';

const MU = UNIVERSE.map(a => a.ret), VOL = UNIVERSE.map(a => a.vol), S = covariance(VOL, CORR);
const MK = point(MU, S, MARKET);
const F = frontier(MU, S, 61, CAPS, [MK.ret]);
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

/* random long-only portfolios inside the caps (seeded), used to check that none beats the solver */
function samples(n: number) {
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const out: { ret: number; vol: number }[] = [];
  while (out.length < n) {
    const g = MU.map(() => (-Math.log(rnd() + 1e-12)) ** (rnd() < .5 ? 1 : 3));
    const t = sum(g), w = g.map(v => v / t);
    if (w.some((v, i) => v > CAPS[i])) continue;
    const p = point(MU, S, w); out.push({ ret: p.ret, vol: p.vol });
  }
  return out;
}

describe('efficient frontier', () => {
  it('inputs are a valid correlation matrix with nine asset classes', () => {
    expect(UNIVERSE).toHaveLength(9);
    for (let i = 0; i < CORR.length; i++) {
      expect(CORR[i][i]).toBe(1);
      for (let j = 0; j < CORR.length; j++) { expect(CORR[i][j]).toBe(CORR[j][i]); expect(Math.abs(CORR[i][j])).toBeLessThanOrEqual(1); }
    }
    expect(minVariance(MU, S, undefined, CAPS)).not.toBeNull();
  });
  it('every point is fully invested, long only, inside the caps, with risk shares summing to 100%', () => {
    expect(F.length).toBe(62);
    for (const p of F) {
      expect(sum(p.w)).toBeCloseTo(1, 9);
      p.w.forEach((w, i) => { expect(w).toBeGreaterThanOrEqual(0); expect(w).toBeLessThanOrEqual(CAPS[i] + 1e-9); });
      expect(sum(p.rc)).toBeCloseTo(1, 9);
    }
  });
  it('return and risk both rise along the curve, ending at the highest return the caps allow', () => {
    for (let i = 1; i < F.length; i++) { expect(F[i].ret).toBeGreaterThan(F[i - 1].ret); expect(F[i].vol).toBeGreaterThan(F[i - 1].vol - 1e-12); }
    expect(F[F.length - 1].ret).toBeCloseTo(maxReturn(MU, CAPS), 9);
    expect(maxReturn(MU, CAPS)).toBeLessThan(Math.max(...MU));
  });
  it('no random portfolio inside the caps has lower risk for the same or higher return', () => {
    const pts = samples(200000);
    for (const q of pts) {
      /* the frontier's risk rises with return, so a portfolio earning at least F[k-1].ret cannot carry less risk than F[k-1] */
      const k = F.findIndex(p => p.ret >= q.ret);
      if (k > 0) expect(q.vol).toBeGreaterThanOrEqual(F[k - 1].vol - 1e-9);
    }
    expect(pts.reduce((m, q) => Math.min(m, q.vol), Infinity)).toBeGreaterThanOrEqual(F[0].vol - 1e-9);
  });
  it('risk shares match a finite-difference Euler decomposition', () => {
    const w = F[20].w, v0 = point(MU, S, w).vol, h = 1e-6;
    const rc = riskShares(S, w);
    w.forEach((wi, i) => { const w2 = w.slice(); w2[i] += h; const d = (point(MU, S, w2).vol - v0) / h; expect(wi * d / v0).toBeCloseTo(rc[i], 5); });
  });
  it('expected returns are market implied: the market portfolio is optimal for them', () => {
    expect(sum(MARKET)).toBeCloseTo(1, 12);
    MARKET.forEach((w, i) => { expect(w).toBeGreaterThan(0); expect(w).toBeLessThanOrEqual(CAPS[i]); });
    /* excess returns are proportional to S w, so the marginal reward to risk is the same for every asset */
    const Sw = S.map(r => r.reduce((t, s, j) => t + s * MARKET[j], 0));
    const k = (MU[0] - CASH) / Sw[0];
    MU.forEach((m, i) => expect((m - CASH) / Sw[i]).toBeCloseTo(k, 10));
    expect(impliedReturns(S, MARKET, RISK_AVERSION, CASH)).toEqual(MU);
    expect(MK.ret).toBeCloseTo(MARKET_RETURN, 12);
    expect(MARKET_RETURN).toBe(0.075);
  });
  it('at the market expected return the solver recovers the market weights, holding all nine', () => {
    const w = minVariance(MU, S, MK.ret, CAPS)!;
    w.forEach((wi, i) => expect(wi).toBeCloseTo(MARKET[i], 8));
    const shipped = POINTS.points[POINTS.market];
    expect(shipped.ret).toBeCloseTo(MK.ret, 6);
    shipped.w.forEach((wi, i) => { expect(wi).toBeCloseTo(MARKET[i], 5); expect(wi).toBeGreaterThan(0); });
  });
  it('credit is held through the middle of the curve', () => {
    const credit = (p: { w: number[] }) => UNIVERSE.reduce((t, a, i) => t + (a.id === 'ig' || a.id === 'hy' ? p.w[i] : 0), 0);
    const mid = F.filter(p => p.vol > 0.06 && p.vol < 0.16);
    expect(mid.length).toBeGreaterThan(20);
    mid.forEach(p => expect(credit(p)).toBeGreaterThan(0.05));
  });
  it('the policy portfolio is a valid investment policy inside the caps', () => {
    const t = POLICY.map(l => l.target);
    expect(sum(t)).toBeCloseTo(1, 12);
    POLICY.forEach((l, i) => {
      expect(l.min).toBeLessThanOrEqual(l.target); expect(l.target).toBeLessThanOrEqual(l.max);
      expect(l.min).toBeGreaterThan(0); expect(l.max).toBeLessThanOrEqual(CAPS[i]);
      expect(l.role.length).toBeGreaterThan(3);
    });
    expect(sum(POLICY.map(l => l.min))).toBeLessThan(1);
    expect(sum(POLICY.map(l => l.max))).toBeGreaterThan(1);
    const ill = UNIVERSE.reduce((s, a, i) => s + (a.id === 'pe' || a.id === 're' ? t[i] : 0), 0);
    expect(ill).toBeLessThanOrEqual(ILLIQUID_MAX);
    /* the policy sits on or below the curve: no feasible mix beats the frontier */
    const pol = point(MU, SIGMA, t), k = F.findIndex(q => q.vol >= pol.vol);
    expect(pol.ret).toBeLessThanOrEqual(F[k].ret + 1e-12);
    expect(pol.ret).toBeCloseTo(0.081, 3); expect(pol.vol).toBeCloseTo(0.130, 3);
  });
  it('the frontier shipped with the page matches a fresh solve', () => {
    expect(POINTS.caps).toEqual(CAPS);
    expect(POINTS.points).toHaveLength(F.length);
    POINTS.points.forEach((p, i) => { expect(p.ret).toBeCloseTo(F[i].ret, 5); expect(p.vol).toBeCloseTo(F[i].vol, 5); p.w.forEach((w, j) => expect(w).toBeCloseTo(F[i].w[j], 5)); });
  });
});
