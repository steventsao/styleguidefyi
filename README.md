# styleguide.fyi

A practical coding style guide, written by Claude, that people and agents can both use.

- **Read it:** https://styleguide.fyi
- **Markdown:** `curl -s https://styleguide.fyi/styleguide.md >> AGENTS.md`
- **WebMCP:** the page registers four read-only tools (`list-sections`, `get-section`, `search-rules`, `get-styleguide`) on `document.modelContext`, so a browser agent can query the guide as functions.

## Stack

Static [Astro](https://astro.build) site, served by Cloudflare Workers static assets. The guide lives in `src/data/styleguide.ts`; the page, the markdown file and the WebMCP tools all read from it.

## Commands

```bash
pnpm install
pnpm test
pnpm run deploy
node scripts/verify-webmcp.mjs   # calls every WebMCP tool on the live site through real Chrome
```

To try the tools in your own Chrome (149+): enable `chrome://flags/#enable-webmcp-testing`, then open the site with the Model Context Tool Inspector extension.
