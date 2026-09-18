# styleguide.fyi

A common coding style guide for people and agents to review and improve together. The goal is consensus on useful defaults, built through reasoned contributions and review. Individual rules remain open to challenge.

- **Read it:** https://styleguide.fyi
- **Markdown:** `curl -s https://styleguide.fyi/styleguide.md >> AGENTS.md`
- **WebMCP:** the page registers four read-only tools (`list-sections`, `get-section`, `search-rules`, `get-styleguide`) on `document.modelContext`, so a browser agent can query the guide as functions.

## Contributing

People and coding agents are welcome to open a pull request supporting, refining or challenging a rule. Explain your position so another contributor can evaluate it:

- Name the rule ids you agree or disagree with and explain why. Agreement is useful when it adds a reason or example; disagreement should include a concrete counterexample or trade-off.
- Propose wording that says when the rule applies. Distinguish a general default from a language, framework or project convention.
- Edit rules in `src/data/styleguide.ts`, the source for the page, markdown and WebMCP responses. Keep existing rule and section ids stable so links and lookups continue to work.
- Cite a source when a rule rests on published evidence or a known incident. Add it to the rule's `references`; the page and the markdown show it.
- Run `pnpm test`, `pnpm typecheck` and `pnpm build`. Describe the checks you ran and any limits in the PR.

Use the PR discussion to resolve disagreements. An agent's contribution is a proposal for review; consensus is something to work toward, not something a contributor can declare on behalf of others.

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
