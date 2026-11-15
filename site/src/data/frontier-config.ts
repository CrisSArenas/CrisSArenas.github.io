/* Settings for the homepage frontier, shared by the page (home.ts) and the build-time solve (scripts/frontier-points.ts).
   No imports, so Node can load it directly. Rationale in tools/frontier-research.md, "Expected returns on the site". */

/* A typical global multi-asset market portfolio for these nine classes, in percent of the total */
export const MARKET_BY_ID: Record<string, number> = { useq: 0.30, intl: 0.14, em: 0.05, gov: 0.22, ig: 0.13, hy: 0.04, pe: 0.05, re: 0.04, hf: 0.03 };
/* long-run cash return, and the average yearly return the market portfolio is set to earn; the risk aversion in
   pi = cash + lambda * Sigma w is solved so the market portfolio earns exactly MARKET_RETURN */
export const CASH = 0.04;
export const MARKET_RETURN = 0.075;
/* institutional position limits: private and less liquid assets are capped, as a real policy portfolio would be */
export const CAPS_BY_ID: Record<string, number> = { pe: 0.20, re: 0.15, hf: 0.15, em: 0.15 };

/* An endowment-style policy portfolio, as an investment policy statement sets it out: a target and an allowed range
   for each asset class, inside the caps above. */
export interface PolicyLine { target: number; min: number; max: number; role: string }
export const POLICY_BY_ID: Record<string, PolicyLine> = {
  useq: { target: 0.22, min: 0.17, max: 0.27, role: 'Long-term growth' },
  intl: { target: 0.12, min: 0.08, max: 0.16, role: 'Growth, diversified' },
  em: { target: 0.06, min: 0.03, max: 0.09, role: 'Higher growth, higher risk' },
  gov: { target: 0.10, min: 0.06, max: 0.15, role: 'Liquidity and protection in a downturn' },
  ig: { target: 0.05, min: 0.02, max: 0.08, role: 'Income' },
  hy: { target: 0.05, min: 0.02, max: 0.08, role: 'Income with growth' },
  pe: { target: 0.18, min: 0.14, max: 0.20, role: 'Long-term growth, illiquid' },
  re: { target: 0.08, min: 0.05, max: 0.11, role: 'Income and inflation sensitivity' },
  hf: { target: 0.14, min: 0.10, max: 0.15, role: 'Diversifier' }
};
/* the policy's objective and rules */
export const INFLATION = 0.025;
export const REAL_OBJECTIVE = 0.05;
export const SPENDING = 0.05;
export const ILLIQUID_MAX = 0.30;
export const LIQUID_MIN = 0.15;
