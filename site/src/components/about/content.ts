/* About page content. Every statement here is backed by a page on the site; the expertise lists come from
   the earlier homepage's "Expertise" and "Models and platforms" sections. Nothing here adds employers, titles,
   dates or education. */

export interface Expertise {
  id: string;
  title: string;
  sentence: string;
  covers: string[];
  tools: string[];
  link: { href: string; label: string };
}

export const EXPERTISE: Expertise[] = [
  {
    id: 'investment',
    title: 'Investment management',
    sentence: 'I manage multi-asset portfolios across public and private markets, covering allocation, portfolio construction, manager research, due diligence and risk.',
    covers: ['Strategic and tactical allocation', 'Portfolio construction', 'Equities', 'Fixed income', 'Hedge funds', 'Private equity', 'Private credit', 'Real assets', 'Manager selection', 'Commitment pacing'],
    tools: ['Addepar', 'BlackRock Aladdin', 'Bloomberg', 'FactSet', 'Morningstar'],
    link: { href: '/work/portfolio-risk-performance/', label: 'Portfolio Risk and Performance' }
  },
  {
    id: 'quant',
    title: 'Quantitative research',
    sentence: 'I apply statistics, optimization, machine learning and deep learning to portfolio construction, risk and systematic strategies.',
    covers: ['Portfolio optimization', 'Black-Litterman', 'Factor and risk models', 'Performance attribution', 'Backtesting and validation', 'Time series', 'Deep learning'],
    tools: ['PyTorch', 'scikit-learn', 'pandas'],
    link: { href: '/research/', label: 'Published research' }
  },
  {
    id: 'ai',
    title: 'AI engineering',
    sentence: 'I design and build agentic systems with multi-agent orchestration, language model integration, retrieval and evaluation, from architecture through production operations.',
    covers: ['Agentic AI systems', 'Multi-agent orchestration', 'Retrieval and RAG', 'LLM evaluation'],
    tools: ['Claude (Anthropic)', 'OpenAI models', 'Open-weight models', 'Claude Agent SDK', 'Claude Code', 'Model Context Protocol', 'LangChain', 'Azure AI Foundry', 'Microsoft 365 Copilot agents', 'Microsoft Graph', 'Entra ID'],
    link: { href: '/work/ai-engineering-lab/', label: 'AI Systems Engineering & Evaluation Lab' }
  },
  {
    id: 'data',
    title: 'Data and infrastructure',
    sentence: 'I build the data pipelines, databases, backend services and cloud deployments that the models and agents run on.',
    covers: [],
    tools: ['Python', 'SQL', 'PySpark', 'pandas', 'Airflow', 'dbt', 'FastAPI', 'Docker', 'Databricks', 'Snowflake', 'PostgreSQL', 'Azure', 'AWS'],
    link: { href: '/ai-systems.html', label: 'AI systems deep dive' }
  }
];

export interface Principle { title: string; body: string; where: { href: string; label: string }[] }

/* Each principle points to the page where a visitor can see it working. */
export const PRINCIPLES: Principle[] = [
  {
    title: 'Numbers are verified',
    body: 'The shared financial math is tested against known answers, and those tests run in your browser. Each key number on the work cards is read from its application at the base case.',
    where: [{ href: '/tests.html', label: 'Model tests' }]
  },
  {
    title: 'Every value cites its source',
    body: 'Extracted figures carry the page and line they came from, so a reviewer can check any number quickly. The evaluation lab scores citation precision and recall.',
    where: [{ href: '/ai-systems.html', label: 'AI systems deep dive' }, { href: '/ai-engineering-lab.html', label: 'Evaluation lab' }]
  },
  {
    title: 'People approve anything consequential',
    body: 'The portfolio monitor proposes fixes and waits for approval before anything trades. In the evaluation lab, every side-effect call stops at an approval gate.',
    where: [{ href: '/agentic-portfolio-monitor.html', label: 'Agentic Portfolio Monitoring' }]
  },
  {
    title: 'Deterministic checks come first',
    body: 'Totals tie, units match, dates fall in range and every citation resolves before a model or a person is asked for judgment.',
    where: [{ href: '/ai-systems.html', label: 'AI systems deep dive' }]
  },
  {
    title: 'Evaluation before release',
    body: 'Each candidate runs through a scored evaluation set, and a release gate holds it back when the scores fall short.',
    where: [{ href: '/ai-engineering-lab.html', label: 'AI Systems Engineering & Evaluation Lab' }]
  }
];

/* the portfolio sentence as the earlier homepage stated it */
export const PM_EXPERIENCE = "I've managed multi-asset portfolios reporting directly to the CIO, as part of a team of portfolio managers focused on allocation across public and private markets.";
export const ENGINEERING_SCOPE = 'The systems I build professionally run on private infrastructure and data, so I do not publish their code or internals. The applications on this site are public reconstructions that run in the browser on synthetic data.';

/* margin labels beside each About paragraph (styling aid only; the paragraphs themselves are unchanged) */
export const PARAGRAPH_LABELS = ['Background', 'Investment', 'Engineering', 'Research', 'Approach'];

/* asset classes named in the approved About text */
export const ASSET_CLASSES = ['Equities', 'Fixed income', 'Hedge funds', 'Private equity', 'Private credit', 'Real assets'];
