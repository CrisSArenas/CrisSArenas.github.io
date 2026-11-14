/* Content for the Engineering Lab page. Project facts come from projects.ts (PROJECTS, LAB); the reference
   architecture follows /ai-systems.html, section 01. */

export const LAB_GROUPS: { id: string; blurb: string }[] = [
  { id: 'Autonomous systems', blurb: 'Planning, localization and mapping for mobile robots, as browser simulators and a ROS 2 build write-up.' },
  { id: 'Embedded computing', blurb: 'Real-time scheduling, memory-mapped peripherals and closed-loop control on microcontrollers.' },
  { id: 'Edge ML', blurb: 'Fitting neural networks into the flash and SRAM of a microcontroller, and what quantization costs.' }
];

export interface ArchPart { id: string; label: string; sub?: string; does: string; guards: string; seen?: { text: string; href: string } }
export interface ArchLayer { id: string; label: string; parts: ArchPart[] }

const AIL = '/ai-engineering-lab.html';
const APM = '/agentic-portfolio-monitor.html';

export const ARCH: ArchLayer[] = [
  { id: 'interfaces', label: 'Interfaces', parts: [
    { id: 'ui', label: 'Interfaces', sub: 'chat · email · web apps · scheduled jobs', does: 'Where people and other systems reach the agents. Every entry point, including a scheduled job, goes through the gateway first.', guards: 'Side doors that would skip identity and audit' }
  ] },
  { id: 'access', label: 'Access', parts: [
    { id: 'gateway', label: 'Gateway', sub: 'single sign-on · identity propagation · rate limits · request audit', does: 'Authenticates the caller and carries their identity into every downstream call, so retrieval and tools see only what that user may see.', guards: 'A model reading data its user cannot open' }
  ] },
  { id: 'orchestration', label: 'Orchestration', parts: [
    { id: 'orchestrator', label: 'Orchestrator', sub: 'plans · budgets · retries', does: 'Plans the run, dispatches workers, enforces step and token budgets, retries failed steps and stops on explicit conditions.', guards: 'Loops, runaway cost and half-finished runs', seen: { text: 'Run and trace tab, AI Systems Engineering & Evaluation Lab', href: AIL } },
    { id: 'workers', label: 'Workers', sub: 'reader · analyst · drafter', does: 'Narrow agents for reading, analysis and drafting, each with its own tools, context and budget.', guards: 'Context drift in one overloaded agent' },
    { id: 'verifier', label: 'Verifier', sub: 'own context', does: 'Re-checks figures and citations against the sources, with its own context, before anything is promoted. It never grades its own work.', guards: 'Unsupported or miscopied answers' },
    { id: 'approval', label: 'Approval gate', sub: 'named person', does: 'Holds anything that moves money, changes a record or reaches a client until a named person signs off. The approver, the time and the exact change go to an append-only log.', guards: 'Unreviewed side effects', seen: { text: 'Proposed fixes wait for approval in Agentic Portfolio Monitoring', href: APM } }
  ] },
  { id: 'capabilities', label: 'Capabilities', parts: [
    { id: 'retrieval', label: 'Retrieval', sub: 'hybrid search · ACL filters', does: 'Hybrid keyword and vector search with reranking and access filters; returns passages with their location.', guards: 'Answers without evidence', seen: { text: 'BM25 retrieval runs as real code in the AI Systems Lab', href: AIL } },
    { id: 'tools', label: 'Tool layer', sub: 'MCP · typed · permissioned', does: 'Typed tool contracts behind a permission policy. Arguments are validated before a call runs.', guards: 'Malformed or unauthorized tool calls', seen: { text: 'Permission checks and injection screening in the AI Systems Lab', href: AIL } },
    { id: 'modelgw', label: 'Model gateway', sub: 'routing · cache · fallback', does: 'Routes each task to a model by measured accuracy, cost and latency, caches long contexts and falls back on outages.', guards: 'Provider outages and cost spikes' }
  ] },
  { id: 'data', label: 'Data and models', parts: [
    { id: 'docs', label: 'Documents and index', sub: 'chunked · versioned', does: 'Documents parsed into passages that keep their page and line, with restated documents kept as new versions.', guards: 'Figures that cannot be traced back to a page' },
    { id: 'governed', label: 'Governed data', sub: 'views · lineage · row access', does: 'The reconciled warehouse layer, exposed to agents only as governed views with lineage and row-level permissions per user.', guards: 'Agents reading unreconciled or unauthorized numbers' },
    { id: 'models', label: 'Models', sub: 'hosted · open-weight in tenant', does: 'Hosted models under zero-retention terms, and open-weight models run inside the firm’s own cloud when data cannot leave.', guards: 'Sensitive data leaving the firm' }
  ] }
];

/* cross-cutting services that run alongside every layer */
export const OPS: ArchPart[] = [
  { id: 'observability', label: 'Observability', sub: 'traces · cost and latency · alerts', does: 'A structured trace per run and per step, with cost, latency and the tools called.', guards: 'Silent degradation in production', seen: { text: 'Trace viewer in the AI Systems Lab', href: AIL } },
  { id: 'evaluation', label: 'Evaluation', sub: 'gold sets · regression in CI · release gates', does: 'Expert-verified gold sets with planted errors, scored on every model, prompt or code change.', guards: 'Regressions that ship unnoticed', seen: { text: 'Evaluation suite and release gate in the AI Systems Lab', href: AIL } }
];

export const EXPERIMENTS = [
  { title: 'Terminal Heist', href: '/terminal-heist.html', desc: 'A puzzle game on an emulated shell with real Unix permission bits.' },
  { title: 'FURNACE', href: '/arcade.html', desc: 'A first-person shooter written from scratch in one HTML file, with a raycasting renderer.' }
];
