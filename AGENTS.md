styleguide.fyi is a static Astro site: one page with a coding style guide, exposed to browser agents over WebMCP. Cloudflare Workers serves `dist/` as static assets. There is no server code, database or CMS.

## Commands

```bash
pnpm test                          # Unit tests: guide data, search, markdown, WebMCP tools
pnpm typecheck                     # astro check
pnpm run deploy                    # astro build && wrangler deploy (production, styleguide.fyi)
node scripts/verify-webmcp.mjs     # End-to-end: real Chrome with WebMCP on, lists and calls every tool on the live site
```

There is no git-triggered deploy. `pnpm run deploy` is the only way to production.

## Key Files

| File                         | Purpose                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `src/data/styleguide.ts`     | The guide: sections and rules. The single source for the page, `/styleguide.md`, and the tools |
| `src/lib/styleguide.ts`      | Markdown output and rule search                                                           |
| `src/lib/webmcp-tools.ts`    | WebMCP tool definitions. No DOM access; page effects go through `PageActions`             |
| `src/scripts/page.ts`        | Browser script: registers the tools, runs the filter, the Run buttons and the copy button |
| `src/pages/index.astro`      | The page                                                                                  |
| `src/pages/styleguide.md.ts` | Static endpoint for the markdown version                                                  |
| `public/_headers`            | CORS and charset for `/styleguide.md`                                                     |

## Rules

- To change the guide, edit `src/data/styleguide.ts` only. Rule ids are public URL anchors and WebMCP lookup keys: do not rename them.
- WebMCP entry point is `document.modelContext` (current spec, Chrome 149+). `navigator.modelContext` is the old one; the page falls back to it.
- WebMCP drops the reason of a rejected `execute` promise. Return problems the agent can correct as `{ error }` values; do not throw.
- Tool results must survive `JSON.stringify`.
- After a change to the tools, deploy and run `node scripts/verify-webmcp.mjs`.
