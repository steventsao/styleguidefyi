styleguide.fyi is a static Astro site: a coding style guide exposed to browser agents over WebMCP, plus a catalog and captured public guides. Cloudflare Workers serves `dist/` as static assets. There is no server code, database or CMS. PostHog measures the pages from the browser.

## Commands

```bash
pnpm test                          # Unit tests: guide data, search, markdown, WebMCP tools
pnpm typecheck                     # astro check
pnpm deploy:preview                # Separate preview deployment on workers.dev
pnpm run deploy                    # astro build && wrangler deploy (production, styleguide.fyi)
node scripts/verify-webmcp.mjs     # End-to-end: real Chrome calls all five tools on production
pnpm verify:site https://styleguide.fyi --commit <full-sha> # Verify deployed assets and release identity
node scripts/verify-analytics.mjs  # End-to-end: real Chrome drives the page, asserts every event leaves it
node scripts/og/shoot.mjs          # Re-render public/og.png from scripts/og/card.html
```

`.github/workflows/ci-deploy.yml` checks pull requests and deploys every successful `main` build to production. It tests, typechecks, builds and verifies the local Cloudflare runtime, then deploys that same artifact and verifies production. Production requires the repository secret `CLOUDFLARE_API_TOKEN` and variable `CLOUDFLARE_ACCOUNT_ID`. Missing credentials fail the deployment visibly. Node 24 and the pinned pnpm version are required.

Use `pnpm deploy:preview` to validate changes before merging; it uses `wrangler.preview.jsonc` with no custom-domain routes. The verifier defaults to production; pass the workers.dev URL to check the preview. For an authorized manual release, set `DEPLOY_COMMIT_SHA` to the clean checkout's full commit hash, run `pnpm run deploy`, then `pnpm verify:site` with that hash. Do not race the automated production deployment.

Copy `.env.example` to `.env` before the first build, and put the real PostHog token in it. The token is not in the repository: CI reads it from the repository variable `PUBLIC_POSTHOG_KEY`. A build without it still succeeds and simply records nothing, so check `/` for the analytics script after a deploy.

## Key Files

| File                         | Purpose                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `src/data/styleguide.ts`     | The guide: sections and rules. The single source for the page, `/styleguide.md`, and the tools |
| `src/lib/styleguide.ts`      | Markdown output and rule search                                                           |
| `src/lib/consensus.ts`      | Agreement labels, review validity and JSON output |
| `src/components/ConsensusTable.astro` | Astra/Fable table, expandable rationales and filters |
| `src/lib/webmcp-tools.ts`    | Four guide tools plus `exec`. Page actions and shell execution are injected             |
| `src/lib/guide-shell.ts`   | Just Bash runtime with a read-only virtual filesystem and execution limits |
| `src/scripts/shell-client.ts` | Creates a browser worker on demand and enforces its lifetime |
| `src/scripts/page.ts`        | Browser script: registers the tools, runs the filter, the Run buttons and the copy button |
| `src/pages/index.astro`      | The page                                                                                  |
| `src/pages/styleguide.md.ts` | Static endpoint for the markdown version                                                  |
| `src/pages/consensus.json.ts` | Static endpoint for reviewer assessments |
| `public/_headers`            | CORS and charset for the markdown, consensus and llms endpoints |
| `src/lib/analytics.ts`       | Event names and `track`: clamps properties, queues until the client loads, never throws |
| `src/scripts/analytics.ts`   | Loads PostHog on a dynamic import and hands the client to `track`                       |
| `src/components/Analytics.astro` | Included by `Base.astro`, so every page reports                                     |
| `src/pages/llms.txt.ts`      | Generated `/llms.txt`: what an agent should fetch, with live counts                     |
| `public/robots.txt`          | Allows every crawler and points at the sitemap                                          |
| `scripts/og/`                | Source and renderer for `public/og.png`, the social preview image                        |
| `scripts/fixtures/exec-cases.json` | Reviewed `exec` results; `guide-tool-cases.json` preserves the four original tools. Both feed unit/live checks |

## Rules

- To change the guide, edit `src/data/styleguide.ts` only. Rule ids are public URL anchors and WebMCP lookup keys: do not rename them.
- Reviewers fill only their own `reviews` entry. `null` means Not rated, never Neutral. Record the current `ruleFingerprint(rule)` as `reviewedHash` only after assessing the wording; do not refresh other reviewers' hashes after editing a rule. Stale assessments must remain Needs review until reassessed.
- WebMCP entry point is `document.modelContext` (current spec, Chrome 149+). `navigator.modelContext` is the old one; the page falls back to it.
- WebMCP drops the reason of a rejected `execute` promise. Return problems the agent can correct as `{ error }` values; do not throw.
- Tool results must survive `JSON.stringify`.
- After a change to the tools, deploy and run `node scripts/verify-webmcp.mjs`.
- The live verifier captures full responses in gitignored `.webmcp-results/latest.json` and compares them with reviewed fixtures. Do not update expectations just to make a failing check pass.
- Analytics goes to PostHog project `styleguidefyi` (635091). `PUBLIC_POSTHOG_KEY` is a public write-only token: it ships in the HTML, so it is not a secret, but it still comes from the environment.
- Add an event by adding it to `EVENTS` in `src/lib/analytics.ts` first. Call `track`, never `posthog.capture`: only `track` clamps long values and survives a client that has not loaded.
- The Cloudflare zone can enable a "Managed robots.txt", which shadows `public/robots.txt`. After a deploy, check `curl -s https://styleguide.fyi/robots.txt` against the repo file; fix a mismatch in the Cloudflare dashboard, not here.
- `/404` answers 200 on its own path, so the 404 page passes `noindex` to `Base.astro`. Unknown paths answer 404 and need nothing.
