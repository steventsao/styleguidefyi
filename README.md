# styleguide.fyi

A common coding style guide for people and agents to review and improve together. The goal is consensus on useful defaults, built through reasoned contributions and review. Individual rules remain open to challenge.

- **Read it:** https://styleguide.fyi
- **Markdown:** `curl -s https://styleguide.fyi/styleguide.md >> AGENTS.md`
- **WebMCP shell preview:** this branch registers one read-only tool, `exec`, on `document.modelContext`. It accepts `{ "command": "ls /guide" }` and returns `{ stdout, stderr, exitCode }`.

## Shell preview

The preview uses Just Bash in a browser Web Worker. The virtual files are generated from `src/data/styleguide.ts`: `/guide/styleguide.md`, `/guide/index.json`, `/guide/sections/*.md`, and `/guide/rules/*.md`. Start with `cat /guide/README.md`.

Each call starts a fresh shell in `/guide`. An adapter rejects all filesystem writes, including redirections and in-place edits. Only selected text/query commands are registered; network and external runtimes are disabled. The page does not persist command history or add command telemetry. Tool results are returned to the calling agent.

The shell accepts up to 4096 characters, with a 3-second execution deadline, a 64 KiB output limit and a separate 10-second worker deadline that includes loading. The worker is terminated after each call. Just Bash's browser package is loaded on first execution; version 3.4.2 still imports `node:zlib`, so the browser build maps that import to an explicit unsupported-compression adapter. The virtual guide contains only plain text.

```bash
pnpm deploy:preview
node scripts/verify-webmcp.mjs https://styleguidefyi-shell.steventsao.workers.dev/
```

`wrangler.preview.jsonc` deploys a separate `styleguidefyi-shell` Worker with a workers.dev address and no custom-domain routes. `pnpm run deploy` still targets production, so use `deploy:preview` for this experiment.

## Contributing

People and coding agents are welcome to open a pull request supporting, refining or challenging a rule. Explain your position so another contributor can evaluate it:

- Name the rule ids you agree or disagree with and explain why. Agreement is useful when it adds a reason or example; disagreement should include a concrete counterexample or trade-off.
- Propose wording that says when the rule applies. Distinguish a general default from a language, framework or project convention.
- Edit rules in `src/data/styleguide.ts`, the source for the page, markdown and WebMCP responses. Keep existing rule and section ids stable so links and lookups continue to work.
- Run `pnpm test`, `pnpm typecheck` and `pnpm build`. Describe the checks you ran and any limits in the PR.

Use the PR discussion to resolve disagreements. An agent's contribution is a proposal for review; consensus is something to work toward, not something a contributor can declare on behalf of others.

## Stack

Static [Astro](https://astro.build) site, served by Cloudflare Workers static assets. The guide lives in `src/data/styleguide.ts`; the page, the markdown file and the WebMCP tools all read from it.

## Commands

```bash
pnpm install
pnpm test
pnpm deploy:preview
node scripts/verify-webmcp.mjs <preview-url>   # exercises exec through real Chrome
```

To try the tools in your own Chrome (149+): enable `chrome://flags/#enable-webmcp-testing`, then open the site with the Model Context Tool Inspector extension.
