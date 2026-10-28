# crissarenas.github.io

Personal site of **Cristian Arenas**, Quantitative Investment Professional and AI Engineer. I build agentic AI systems and quantitative models for private markets and multi-asset portfolios, from first idea to production, with people in the loop.

Live at https://crissarenas.github.io

## What is here

| Area | Files |
|------|-------|
| Home: about, work, AI systems, investment memos, research, contact | `index.html`, `script.js` |
| Flagship demos (in-browser, synthetic data, fictional entities) | `allocation-lab.html`, `private-capital-lab.html`, `manager-selection-copilot.html`, `fund-terms-auditor.html`, `co-invest-underwriter.html`, `secondaries-desk.html`, `multi-strategy-builder.html`, `agentic-portfolio-monitor.html` |
| Shared math library and its tests | `assets/js/pm-math.js`, `assets/js/pm-tests.js`, `tests.html`, `tests/run.js` |
| Shared components | `styles.css`, `assets/css/demo-shell.css`, `assets/js/pm-ui.js`, `assets/js/site.js` |
| Practitioner notes | `notes/` |
| Research and interactive paper summary | `research.html`, `research-regime-aware-transformer.html`, `assets/research/` |
| Games and robotics simulators | `arcade.html`, `furnace.html`, `terminal-heist.html`, `robotics-embedded.html`, `robotics/` |
| Tooling (not served content) | `tools/` |

Static site, no build step. Every demo is a self-contained HTML page that shares the stylesheets, the component script and the math library. Serve the folder with any static server, for example `python -m http.server 8765`, and open http://localhost:8765. Pages use root-relative links, so open them through a server rather than from the file system.

## Checks

```
node tests/run.js                 # math tests (the same tests run on /tests.html)
node tools/sync-chrome.mjs --check  # nav and footer identical on every page
node tools/contrast.mjs           # WCAG AA contrast, light and dark
node tools/qa.mjs <pages>         # console errors and horizontal scroll (server on :8765)
```

All demos use synthetic data and fictional funds, managers and companies. Nothing here is investment advice.

## License

Code is available under the [MIT License](LICENSE). Research papers in `assets/research/` are the author's own work and are shared for personal, non-commercial reading; cite the SSRN version.

## Contact

- LinkedIn: [cristian-arenas-ai-engineer](https://www.linkedin.com/in/cristian-arenas-ai-engineer)
- Email: cristianmiguelsa@gmail.com
