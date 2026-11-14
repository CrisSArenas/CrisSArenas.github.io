import { PROJECTS, AREAS, type AreaId } from './projects';

/* Results from Sanchez Arenas (2026), the published paper in PAPER (site.ts). Every number is copied from the
   paper's result tables as reproduced on /research-regime-aware-transformer.html. */

export type MethodGroup = 'card' | 'neural' | 'trad';
export const METHODS: { id: string; group: MethodGroup; plain: string }[] = [
  { id: 'RAT-CARD', group: 'card', plain: 'The transformer with cross-attention regime discovery proposed in the paper' },
  { id: 'RAT-CREM', group: 'neural', plain: 'The same transformer with a VAE-based regime module instead of CARD' },
  { id: 'LSTM', group: 'neural', plain: 'A plain recurrent network with no regime module' },
  { id: 'MLP', group: 'neural', plain: 'A plain feed-forward network with no sequence structure' },
  { id: 'Equal Weight', group: 'trad', plain: 'The same weight in each of the 10 assets' },
  { id: 'Min Variance', group: 'trad', plain: 'Minimum variance with Ledoit-Wolf shrinkage' },
  { id: 'Risk Parity', group: 'trad', plain: 'Each asset contributes the same share of risk' },
  { id: 'HRP', group: 'trad', plain: 'Hierarchical risk parity' },
  { id: 'GMM-MVO', group: 'trad', plain: 'Two stages: a mixture model labels the regime, then a mean-variance optimizer allocates' }
];
export const GROUP_LABEL: Record<MethodGroup, string> = { card: 'This paper', neural: 'Other neural models', trad: 'Traditional baselines' };

export type Dgp = 'A' | 'B' | 'C';
export const DGPS: { id: Dgp; label: string; short: string; plain: string }[] = [
  { id: 'A', label: 'Base', short: 'DGP-A', plain: 'Three regimes with moderate separation. Growth persists 0.92 month to month, contraction 0.82, crisis 0.65.' },
  { id: 'B', label: 'Persistent', short: 'DGP-B', plain: 'Regimes change less often: persistence 0.97, 0.92 and 0.85.' },
  { id: 'C', label: 'Low SNR', short: 'DGP-C', plain: 'Same transitions as the base, with half the gap between regime means, 130% of the volatility and 150% of the feature noise.' }
];

/* Table 2: annualized out-of-sample Sharpe ratio, [mean, standard deviation] across seeds 42, 123 and 7 */
export const SHARPE: Record<Dgp, Record<string, [number, number]>> = {
  A: { 'RAT-CARD': [0.822, 0.397], 'RAT-CREM': [0.992, 0.430], LSTM: [1.125, 0.449], MLP: [0.874, 0.463], 'Equal Weight': [0.294, 0.400], 'Min Variance': [0.818, 0.275], 'Risk Parity': [0.641, 0.335], HRP: [0.538, 0.225], 'GMM-MVO': [0.444, 0.426] },
  B: { 'RAT-CARD': [0.692, 0.316], 'RAT-CREM': [0.779, 0.326], LSTM: [0.746, 0.325], MLP: [0.747, 0.263], 'Equal Weight': [0.162, 0.201], 'Min Variance': [0.500, 0.277], 'Risk Parity': [0.414, 0.235], HRP: [0.260, 0.219], 'GMM-MVO': [0.489, 0.403] },
  C: { 'RAT-CARD': [0.450, 0.542], 'RAT-CREM': [0.667, 0.453], LSTM: [0.808, 0.349], MLP: [0.293, 0.486], 'Equal Weight': [-0.306, 0.350], 'Min Variance': [0.345, 0.385], 'Risk Parity': [0.029, 0.392], HRP: [-0.111, 0.353], 'GMM-MVO': [0.579, 0.366] }
};

/* one plain sentence per process about what the chart shows, checked against the table above */
export const DGP_READING: Record<Dgp, string> = {
  A: 'On the base process every neural model has a higher mean than every traditional baseline, though minimum variance (0.82) is level with RAT-CARD. The plain LSTM has the highest mean of all.',
  B: 'With longer-lasting regimes the four neural models bunch together between 0.69 and 0.78, and all of them stay ahead of the traditional baselines.',
  C: 'With a weak signal, equal weight and hierarchical risk parity turn negative while every neural model stays positive. The LSTM again has the highest mean, and the two-stage GMM-MVO (0.58) finishes ahead of RAT-CARD (0.45).'
};

export const KEY_NUMBERS = [
  { value: '0.82', label: 'RAT-CARD Sharpe ratio on the base process, against 0.29 for equal weight' },
  { value: '1.13', label: 'Sharpe ratio of a plain LSTM on the same process, the highest mean of any method' },
  { value: '0.03 vs 0.59', label: 'How well CARD and a mixture model recover the true regimes (adjusted Rand index)' },
  { value: '24,127', label: 'Parameters in RAT-CARD, about 1.0 ms per forward pass' }
];

/* Model configuration, from the paper */
export const CONFIG: [string, string][] = [
  ['Input window', '12 months × 22 features (10 asset returns, 8 macro, 4 stress), expanding-window z-scores'],
  ['Temporal encoder', 'Transformer, d_model = 32, 2 layers, 4 heads, learned positional encodings'],
  ['CARD module', 'K = 3 regime queries, 2 attention heads, orthogonal initialization, layer norm and residual'],
  ['Allocation heads', 'One per regime: linear, softmax, clamp to [0.02, 0.25], renormalize, N = 10 assets'],
  ['Objective', 'Negative batch Sharpe + λ_ent · regime entropy + λ_conc · Herfindahl concentration'],
  ['Optimizer', 'AdamW, learning rate 5×10⁻⁴, weight decay 10⁻⁴, gradient clip 1.0, plateau halving, early stop at patience 35']
];

/* Quantitative methods used across the site, each linked to the application that implements it */
export const METHODOLOGY: { name: string; plain: string; app: string }[] = [
  { name: 'Walk-forward validation', plain: 'Fit on the past, test on the next five years, roll forward and repeat, so no result is scored on data the model was fitted to.', app: 'systematic-research-lab' },
  { name: 'Deflated Sharpe ratio', plain: 'Counts every variant tried and shrinks the best Sharpe ratio for that number, so a lucky backtest is not mistaken for skill.', app: 'systematic-research-lab' },
  { name: 'Brinson-Fachler attribution', plain: 'Splits the gap to the benchmark, asset class by asset class, into what came from the allocation and what came from the managers picked.', app: 'portfolio-risk-performance' },
  { name: 'Euler risk decomposition', plain: 'Weight times marginal risk gives each holding a share of total volatility, and the shares add up exactly.', app: 'portfolio-risk-performance' },
  { name: 'Desmoothing private marks', plain: 'Appraisal-based private returns look calmer than the assets behind them. Desmoothing recovers the volatility they hide.', app: 'private-capital-lab' },
  { name: 'Takahashi-Alexander pacing', plain: 'Models how each fund calls capital, grows its NAV and pays out, to size the commitments that keep a private allocation on target.', app: 'private-capital-lab' }
];

/* The writing library: investment memos and practitioner notes, each attached to the application it draws on */
export type DocType = 'Investment memo' | 'Practitioner note';
export interface LibraryItem { title: string; href: string; type: DocType; area: AreaId; areaLabel: string; desc: string; app: { title: string; href: string } }
const DESC: Record<string, string> = {
  '/memos/quarterly-portfolio-review.html': 'A multi-asset portfolio’s quarter against its policy benchmark: where the risk sits and what to change.',
  '/memos/policy-portfolio-review.html': 'The annual review of an endowment’s asset mix, with private assets in the portfolio.',
  '/memos/allocation-committee-note.html': 'The quarter’s tactical tilts and rebalancing for an endowment that has drifted from its policy ranges.',
  '/memos/multi-strategy-book.html': 'Five hedge fund sleeves sized by risk, reviewed on ten years of monthly returns.',
  '/memos/buyout-fund-diligence.html': 'A mid-market buyout manager raising its third fund on the record of the first two.',
  '/memos/private-markets-pacing.html': 'An endowment sets its next three vintages while its private NAVs are a quarter old.',
  '/memos/fund-terms-review.html': 'A GP’s quarterly reports on fees, offsets and carry, read against the fund’s LPA.',
  '/memos/co-investment-valebrook.html': 'A co-investment offered alongside a buyout fund already in the portfolio, with a short window to answer.',
  '/memos/secondary-lp-portfolio.html': 'Six fund interests offered for sale, and a continuation vehicle vote on a fund already held.',
  '/notes/saa-or-tpa.html': 'A total portfolio approach swaps fixed asset class targets for a reference portfolio and a risk budget. What that changes day to day.',
  '/notes/two-sleeves-same-bet.html': 'Low correlation between sleeves can hide a shared factor bet until a crowded unwind. Factor loadings show it earlier.',
  '/notes/one-deal-track-record.html': 'A strong record often rests on one exit. A few numbers tell you how much of it the GP can repeat.',
  '/notes/pacing-stale-navs.html': 'Reported NAVs lag public markets. Nowcast them before you size next year’s commitments.',
  '/notes/irr-subscription-line.html': 'A subscription line lifts IRR and barely moves the multiple. Rebuild the cash flows to see the return underneath.',
  '/notes/roll-or-sell.html': 'How to compare the continuation vehicle price with rolling, once new fees, the carry reset and the longer hold are priced in.'
};
export const LIBRARY: LibraryItem[] = PROJECTS.flatMap(p => {
  const base = { area: p.area, areaLabel: AREAS[p.area].label, app: { title: p.title, href: p.href } };
  const out: LibraryItem[] = [];
  if (p.memo) out.push({ ...base, title: p.memo.title, href: p.memo.href, type: 'Investment memo', desc: DESC[p.memo.href] || '' });
  if (p.note) out.push({ ...base, title: p.note.title, href: p.note.href, type: 'Practitioner note', desc: DESC[p.note.href] || '' });
  return out;
});
