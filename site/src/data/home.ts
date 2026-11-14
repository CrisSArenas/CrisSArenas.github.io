/* Content and illustrative assumptions used only by the homepage. Project facts live in projects.ts and site.ts. */

/* Hero frontier: a small multi-asset universe with plausible long-run assumptions (annualized, illustrative, not forecasts).
   Private equity volatility is desmoothed, because reported private valuations understate how much they move. */
export const UNIVERSE = [
  { id: 'eq', name: 'Global equities', short: 'Equities', ret: 0.072, vol: 0.160 },
  { id: 'pe', name: 'Private equity', short: 'Private eq.', ret: 0.085, vol: 0.230 },
  { id: 'fi', name: 'Fixed income', short: 'Fixed income', ret: 0.040, vol: 0.060 },
  { id: 'ra', name: 'Real assets', short: 'Real assets', ret: 0.060, vol: 0.130 },
  { id: 'hf', name: 'Hedge funds', short: 'Hedge funds', ret: 0.050, vol: 0.075 }
] as const;
export const CORR: number[][] = [
  [1.00, 0.80, 0.10, 0.55, 0.70],
  [0.80, 1.00, 0.05, 0.50, 0.60],
  [0.10, 0.05, 1.00, 0.20, 0.10],
  [0.55, 0.50, 0.20, 1.00, 0.45],
  [0.70, 0.60, 0.10, 0.45, 1.00]
];

/* The six steps of running a portfolio, each shown in a working application (slug from projects.ts) or a memo. */
export const PM_STEPS = [
  { n: '01', title: 'Policy and ranges', text: 'Set the strategic mix, the ranges around it and how much liquidity the portfolio needs.', slug: 'allocation-lab' },
  { n: '02', title: 'Tactical views', text: 'Decide when to lean away from policy and by how much, inside a risk budget.', slug: 'allocation-rebalancing' },
  { n: '03', title: 'Manager selection', text: 'Find, diligence and monitor the managers who run each sleeve, public and private.', slug: 'manager-selection-copilot' },
  { n: '04', title: 'Private markets program', text: 'Pace commitments, pick funds and co-investments, and keep the program on target.', slug: 'private-capital-lab' },
  { n: '05', title: 'Risk and rebalancing', text: 'Track where the risk sits, stay inside ranges, and fund capital calls and spending.', slug: 'portfolio-risk-performance' },
  { n: '06', title: 'Committee reporting', text: 'Explain performance, risk and the next decision to the investment committee.', href: '/memos/quarterly-portfolio-review.html', label: 'the quarterly portfolio review' }
] as const;
export const ASSET_CLASSES = ['Public equities', 'Fixed income', 'Hedge funds', 'Private equity', 'Private credit', 'Real assets'];

/* How the agent systems are built, from the top of the stack down. Plain first; detail behind a disclosure. */
export const AI_LAYERS = [
  {
    id: 'orch', n: '01', title: 'Orchestrator and narrow workers',
    plain: 'One agent plans the task and hands each part to a worker with a single job, such as reading documents, analysing them or checking the result, the way an investment team splits its work.',
    tech: ['Orchestrator-worker design with typed tool contracts and step budgets.', 'Fixed workflows where the path is known; planning only where the task varies.', 'Every step is recorded, so a run can be replayed and inspected.'],
    see: 'ai-engineering-lab'
  },
  {
    id: 'tools', n: '02', title: 'Retrieval and permissioned tools',
    plain: 'Agents answer only from documents the user is allowed to read, and can call only the tools that the user\u2019s role permits.',
    tech: ['BM25 retrieval and a reranker, with an access filter that drops documents the role may not read before anything reaches the context.', 'An injection screen checks every sentence that would enter the context for instructions aimed at the assistant.', 'The tool executor checks every call against the role\u2019s permissions before it runs.'],
    see: 'ai-engineering-lab'
  },
  {
    id: 'verify', n: '03', title: 'Verification and human approval',
    plain: 'A separate verifier rejects any draft its cited sources do not support, and a person approves anything that would change something before it happens.',
    tech: ['The verifier scores how well the cited passages cover the question and sends unsupported drafts back.', 'Side-effect tools stop at an approval gate; the policy can require approval for all actions or only high-impact ones.', 'Approvals and rejections are written to an audit log.'],
    see: 'agentic-portfolio-monitor'
  },
  {
    id: 'eval', n: '04', title: 'Evaluation and observability',
    plain: 'Every version of the system is run against a fixed set of test cases, so a change that breaks something shows up before anyone relies on it.',
    tech: ['A labeled regression suite replays each case and scores the answer, the citations and the tool calls.', 'Each span in a trace records its inputs, outputs, timing, cost and retries.', 'A candidate configuration is compared with the baseline case by case, with a regression diff.'],
    see: 'ai-engineering-lab'
  }
] as const;

/* The hero's agent illustration: a scripted run of the pattern (no model is called). */
export type AgentNode = 'task' | 'orch' | 'reader' | 'analyst' | 'verifier' | 'gate' | 'act';
export interface AgentStep { node: AgentNode; from?: AgentNode; status: 'run' | 'ok' | 'reject' | 'wait'; text: string }
export const AGENT_TASK = 'Summarise private credit exposure for the committee note';
export const AGENT_STEPS: AgentStep[] = [
  { node: 'orch', from: 'task', status: 'ok', text: 'Plans the task and splits it into reading, analysis and a check.' },
  { node: 'reader', from: 'orch', status: 'ok', text: 'Retrieves four passages from sources it is permitted to read.' },
  { node: 'analyst', from: 'orch', status: 'ok', text: 'Drafts the summary with citations, including a quarter-on-quarter change.' },
  { node: 'verifier', from: 'orch', status: 'reject', text: 'Rejects the draft because the quarter-on-quarter change appears in no cited passage.' },
  { node: 'analyst', from: 'verifier', status: 'ok', text: 'Reruns with the verifier’s note and keeps only figures it can cite.' },
  { node: 'verifier', from: 'orch', status: 'ok', text: 'Accepts the revised draft, since every figure now matches a cited passage.' },
  { node: 'gate', from: 'verifier', status: 'wait', text: 'Holds the result for a person to review before anything is acted on.' },
  { node: 'gate', status: 'ok', text: 'Reviewer approves. The decision is written to the audit log.' },
  { node: 'act', from: 'gate', status: 'ok', text: 'Adds the summary to the committee note draft.' }
];
