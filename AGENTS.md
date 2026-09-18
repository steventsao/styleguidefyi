styleguide.fyi is a static Astro site: one page with a coding style guide, exposed to browser agents over WebMCP. Cloudflare Workers serves `dist/` as static assets. There is no server code, database or CMS.

## Commands

```bash
pnpm test                          # Unit tests: guide data, search, markdown, WebMCP tools
pnpm typecheck                     # astro check
pnpm deploy:preview                # Separate shell experiment on workers.dev
pnpm run deploy                    # astro build && wrangler deploy (production, styleguide.fyi)
node scripts/verify-webmcp.mjs     # End-to-end: real Chrome calls exec on the live shell preview
```

There is no git-triggered deploy. `pnpm run deploy` is the only way to production. Use `pnpm deploy:preview` for the shell experiment; it uses `wrangler.preview.jsonc` with no custom-domain routes. The verifier defaults to the live shell preview; pass a URL to check another deployment.

## Key Files

| File                         | Purpose                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `src/data/styleguide.ts`     | The guide: sections and rules. The single source for the page, `/styleguide.md`, and the tools |
| `src/lib/styleguide.ts`      | Markdown output and rule search                                                           |
| `src/lib/webmcp-tools.ts`    | The single `exec` WebMCP definition. No DOM access; shell execution is injected             |
| `src/lib/guide-shell.ts`   | Just Bash runtime with a read-only virtual filesystem and execution limits |
| `src/scripts/shell-client.ts` | Creates a browser worker on demand and enforces its lifetime |
| `src/scripts/page.ts`        | Browser script: registers the tools, runs the filter, the Run buttons and the copy button |
| `src/pages/index.astro`      | The page                                                                                  |
| `src/pages/styleguide.md.ts` | Static endpoint for the markdown version                                                  |
| `public/_headers`            | CORS and charset for `/styleguide.md`                                                     |
| `scripts/fixtures/exec-cases.json` | Reviewed complete `exec` inputs/results, shared by unit tests and live WebMCP checks |

## Rules

- To change the guide, edit `src/data/styleguide.ts` only. Rule ids are public URL anchors and WebMCP lookup keys: do not rename them.
- WebMCP entry point is `document.modelContext` (current spec, Chrome 149+). `navigator.modelContext` is the old one; the page falls back to it.
- WebMCP drops the reason of a rejected `execute` promise. Return problems the agent can correct as `{ error }` values; do not throw.
- Tool results must survive `JSON.stringify`.
- After a change to the tools, deploy and run `node scripts/verify-webmcp.mjs`.
- The live verifier captures full responses in gitignored `.webmcp-results/latest.json` and compares them with reviewed fixtures. Do not update expectations just to make a failing check pass.
