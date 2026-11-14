/* Settings for the homepage frontier, shared by the page (home.ts) and the build-time solve (scripts/frontier-points.ts).
   No imports, so Node can load it directly. Rationale in tools/frontier-research.md, "Expected returns on the site". */

/* A typical global multi-asset market portfolio for these nine classes, in percent of the total */
export const MARKET_BY_ID: Record<string, number> = { useq: 0.30, intl: 0.14, em: 0.05, gov: 0.22, ig: 0.13, hy: 0.04, pe: 0.05, re: 0.04, hf: 0.03 };
/* long-run cash return and the risk aversion used to back out market-implied returns (pi = cash + lambda * Sigma w) */
export const CASH = 0.03;
export const RISK_AVERSION = 2.5;
/* institutional position limits: private and less liquid assets are capped, as a real policy portfolio would be */
export const CAPS_BY_ID: Record<string, number> = { pe: 0.20, re: 0.15, hf: 0.15, em: 0.15 };
