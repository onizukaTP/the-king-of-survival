# The King of Survival

A single-player, browser-based, post-apocalyptic survival RPG set in Tamil Nadu, 27 years after nuclear annihilation.
You play Prabu, a hunter from a struggling settlement on the forest edge near Srivilliputhur.

**Play the current build:** https://onizukatp.github.io/the-king-of-survival/

> Status: early prototype. M0–M4b and fire and cooking are live: skeleton, world map and travel, items and inventory, survival, scavenging, town maps, fire and cooking. See [docs/progress.md](docs/progress.md).

## Docs

| File | What's in it |
|---|---|
| [CLAUDE.md](CLAUDE.md) | The standing brief: canon, rules, decisions, milestones, workflow. Start here. |
| [docs/requirements.md](docs/requirements.md) | Every requirement and its status, traced to a decision. |
| [docs/decisions.md](docs/decisions.md) | Decision log (confirmed / proposed / open). |
| [docs/world.md](docs/world.md) | Geography and setting decisions, prototype sites. |
| [docs/ui.md](docs/ui.md) | Approved screen layouts. |
| [docs/architecture.md](docs/architecture.md) | How the code works. |
| [docs/progress.md](docs/progress.md) | What's done, in progress, pending and blocked. |
| [CREDITS.md](CREDITS.md) | Data and asset sources. |

## Development

Requires Node 22+.

```bash
npm install
npm run dev          # dev server at http://localhost:5173
npm run build        # production build to dist/
npm run preview      # serve the production build
npm run typecheck
npm run lint
npm test             # unit tests (Vitest)
npx playwright install chromium   # once, for e2e
npm run test:e2e     # e2e smoke tests (Playwright)
```

Stack: TypeScript, Vite, React, Zustand, Zod, IndexedDB, Vitest, Playwright, GitHub Actions and Pages.

## Branching

- Work happens on `feature/*`, `chore/*`, `docs/*` and `ci/*` branches cut from `dev`.
- Finished branches are merged into `dev` with `--no-ff`.
- `dev` is merged into `main` to release; every push to `main` deploys to GitHub Pages.
