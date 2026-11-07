# crissarenas.github.io

Personal site of **Cristian Arenas**: Quantitative Investment Management & AI Engineering. Portfolio management across public and private markets, quantitative research, and the architecture and evaluation of agentic AI systems, shown through working applications, research and investment memos.

Live at https://crissarenas.github.io

## What is here

| Area | Files |
|------|-------|
| Home: about, expertise, selected work, investment management, AI engineering, research, contact | `index.html`, `script.js` |
| Library: every application, the research library by category, technical projects | `library.html` |
| Portfolio management and allocation | `portfolio-risk-performance.html`, `allocation-lab.html`, `allocation-rebalancing.html` |
| Quantitative research and manager analysis | `systematic-research-lab.html`, `multi-strategy-builder.html`, `manager-selection-copilot.html` |
| AI engineering | `ai-engineering-lab.html`, `agentic-portfolio-monitor.html`, `ai-systems.html` (deep dive), `assets/js/ai-lab.js` |
| Private markets and alternatives | `private-capital-lab.html`, `fund-terms-auditor.html`, `co-invest-underwriter.html`, `secondaries-desk.html` |
| Investment memos (written from the demos' base cases) | `memos/` |
| Shared math library and its tests | `assets/js/pm-math.js`, `assets/js/pm-tests.js`, `tests.html`, `tests/run.js` |
| Shared components | `styles.css`, `assets/css/demo-shell.css`, `assets/js/pm-ui.js`, `assets/js/site.js` |
| Practitioner notes | `notes/` |
| Research and interactive paper summary | `research.html`, `research-regime-aware-transformer.html`, `assets/research/` |
| Games and robotics simulators | `arcade.html`, `furnace.html`, `terminal-heist.html`, `robotics-embedded.html`, `robotics/` |
| Tooling (not served content) | `tools/` |

Static site, no build step. Every application runs in the browser on synthetic data and fictional entities. The AI demos call no language model: their agents are deterministic simulations, while retrieval, permission checks, approval gates and scoring are real code, and each page says which is which.

Every demo is a self-contained HTML page that shares the stylesheets, the component script and the math library. Serve the folder with any static server, for example `python -m http.server 8765`, and open http://localhost:8765. Pages use root-relative links, so open them through a server rather than from the file system.

## Checks

```
node tests/run.js                 # math tests (the same tests run on /tests.html)
node tools/sync-chrome.mjs --check  # nav and footer identical on every page
node tools/contrast.mjs           # WCAG AA contrast, light and dark
node tools/qa.mjs <pages>         # console errors and horizontal scroll (server on :8765)
node tools/card-stats.mjs --check # card numbers on the homepage and library match each demo (server on :8765)
```

All demos use synthetic data and fictional funds, managers and companies. Nothing here is investment advice.

## License

Code is available under the [MIT License](LICENSE). Research papers in `assets/research/` are the author's own work and are shared for personal, non-commercial reading; cite the SSRN version.

## Contact

- LinkedIn: [cristian-arenas-ai-engineer](https://www.linkedin.com/in/cristian-arenas-ai-engineer)
- Email: cristianmiguelsa@gmail.com
