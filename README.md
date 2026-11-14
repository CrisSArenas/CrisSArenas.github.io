# crissarenas.github.io

Personal site of **Cristian Arenas**: Quantitative Investment Management & AI Engineering. Portfolio management across public and private markets, quantitative research, and the architecture and evaluation of agentic AI systems, shown through working applications, research and investment memos.

Live at https://crissarenas.github.io

## What is here

The site has two layers that share one palette (`assets/css/tokens.css`).

**The main site** is a React and TypeScript front end in `site/` (Vite, Tailwind, Motion and D3). It builds static pages that are published into the repository root:

| Page | URL | Source |
|------|-----|--------|
| Home | `/` | `site/src/pages/home.tsx` |
| Work, and a case study for every application | `/work/`, `/work/<slug>/` | `work.tsx`, `case.tsx`, `site/src/data/projects.json` |
| Research: the published paper, memos and notes | `/research/` | `research.tsx` |
| Engineering Lab: robotics, embedded and edge ML | `/lab/` | `lab.tsx` |
| About | `/about/` | `about.tsx`, `site/src/components/about/` |
| Contact | `/contact/` | `contact.tsx` |

The approved wording (title, hero line, About text, contact details) lives in `site/src/data/site.ts`; the applications and lab items in `site/src/data/projects.json`; each application's key number in `assets/data/card-stats.json`, which `tools/card-stats.mjs` reads from the application itself.

**The applications** are self-contained HTML pages that stay where they were, share `styles.css`, `assets/css/demo-shell.css`, `assets/js/pm-ui.js`, `assets/js/site.js` and the math library, and carry the same nav and footer:

| Area | Files |
|------|-------|
| Portfolio management and allocation | `portfolio-risk-performance.html`, `allocation-lab.html`, `allocation-rebalancing.html` |
| Quantitative research and manager analysis | `systematic-research-lab.html`, `multi-strategy-builder.html`, `manager-selection-copilot.html` |
| AI engineering | `ai-engineering-lab.html`, `agentic-portfolio-monitor.html`, `ai-systems.html` (deep dive), `assets/js/ai-lab.js` |
| Private markets and alternatives | `private-capital-lab.html`, `fund-terms-auditor.html`, `co-invest-underwriter.html`, `secondaries-desk.html` |
| Investment memos (written from the demos' base cases) | `memos/` |
| Practitioner notes | `notes/` |
| Interactive paper summary and the paper | `research-regime-aware-transformer.html`, `assets/research/` |
| Robotics and embedded simulators and write-ups | `robotics/` |
| Shared math library and its tests | `assets/js/pm-math.js`, `assets/js/pm-tests.js`, `tests.html`, `tests/run.js` |
| Games | `arcade.html`, `furnace.html`, `terminal-heist.html` |
| Tooling (not served content) | `tools/` |

`library.html`, `research.html` and `robotics-embedded.html` are now small redirects to `/work/`, `/research/` and `/lab/`, so old links keep working. `404.html` is served for any missing URL.

Every application runs in the browser on synthetic data and fictional entities. The AI demos call no language model: their agents are deterministic simulations, while retrieval, permission checks, approval gates and scoring are real code, and each page says which is which.

## Build and publish

```
cd site
npm install
npm run dev        # writes the page entries, then serves the site and the applications on http://localhost:5173
npm run build      # page entries, type check, Vite build, then publishes into the repository root
```

`npm run build` copies the built pages to `/index.html`, `/work/`, `/research/`, `/lab/`, `/about/`, `/contact/` and their assets to `/assets/site/`. Commit those along with the source; GitHub Pages serves the repository root as it is.

The applications need no build. Serve the repository root with any static server, for example `python -m http.server 8765`, and open http://localhost:8765. Pages use root-relative links, so open them through a server rather than from the file system.

## Checks

```
node tests/run.js                   # math tests (the same tests run on /tests.html)
node tools/sync-chrome.mjs --check  # nav and footer identical on every application page (run without --check to stamp tools/partials/)
node tools/contrast.mjs             # WCAG AA contrast, light and dark
node tools/qa.mjs <pages>           # console errors and horizontal scroll (server on :8765)
node tools/card-stats.mjs --check   # each application's key number matches assets/data/card-stats.json (server on :8765)
node tools/sitemap.mjs              # rewrite sitemap.xml
node tools/render-images.mjs        # re-render og.png and the favicon fallbacks
```

All demos use synthetic data and fictional funds, managers and companies. Nothing here is investment advice.

## License

Code is available under the [MIT License](LICENSE). Research papers in `assets/research/` are the author's own work and are shared for personal, non-commercial reading; cite the SSRN version.

## Contact

- LinkedIn: [cristian-arenas-ai-engineer](https://www.linkedin.com/in/cristian-arenas-ai-engineer)
- Email: cristianmiguelsa@gmail.com
