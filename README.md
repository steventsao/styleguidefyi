# styleguide.fyi

A common coding style guide for people and agents to review and improve together. The goal is consensus on useful defaults, built through reasoned contributions and review. Individual rules remain open to challenge.

- **Read it:** https://styleguide.fyi
- **Markdown:** `curl -s https://styleguide.fyi/styleguide.md >> AGENTS.md`
- **Agreement table:** one row per rule, with independent Astra and Fable assessments; available at `/#consensus` and `/consensus.json`.
- **Reference catalog:** `/#references`, `/references.md` and `/references.json` explain the scope, application, checks and limits of public style guides and engineering references.
- **WebMCP:** the page registers five read-only tools on `document.modelContext`: `list-sections`, `get-section`, `search-rules`, `get-styleguide`, and `exec`. The first four provide direct guide queries. `exec` accepts `{ "command": "ls /guide" }` and returns `{ stdout, stderr, exitCode }` for custom shell queries.
- **OpenAI plugin:** `plugins/styleguide-fyi/` packages a remote MCP server and an MCP App for the ChatGPT sidebar and conversation panel. The app browses and searches the same rules as the site, supports rule and section deep links, and can add a selected rule to the conversation context. Composer mentions return links to individual rules.

## OpenAI plugin

The plugin Worker uses `src/data/styleguide.ts` as its only guide data source. Its tools are read-only: `browse_guide`, `get_rule`, `get_section`, `search_rules`, `get_styleguide`, and `search_mentions`. Rule and section ids match the site's URL anchors. The model gets exact rule text and a source URL; the app offers browsing, search, examples and source links. The guide is a proposed set of defaults, so project instructions take priority.

[Preview the sidebar, search, conversation panel, and walkthrough](docs/plugin/README.md).

Use Node 24 to check the remote MCP transport locally:

```bash
pnpm install
pnpm plugin:dev --port 8791
# In another terminal:
pnpm plugin:verify http://localhost:8791/mcp
```

`pnpm plugin:build` creates the self-contained app HTML used by the MCP resource. It runs automatically before tests, typechecking and builds. `pnpm plugin:dry-run` checks the Worker bundle. The preview Worker uses `wrangler.plugin.preview.jsonc`; the production Worker uses `wrangler.plugin.jsonc` and serves `https://plugin.styleguide.fyi/mcp`. The portable manifest in `plugins/styleguide-fyi/plugin.json` and `mcp.json` points to that production endpoint. Production CI deploys the MCP Worker after the static site, then verifies its tools and app resource. The endpoint must be deployed before installing or submitting the plugin.

The existing `mcp.styleguide.fyi/*` Worker route serves a separate backend. Keep the plugin on its own hostname so its tools and app resource reach the intended Worker.

For a local preview deployment, run `pnpm plugin:deploy:preview` and pass its workers.dev `/mcp` URL to `pnpm plugin:verify`. To test the plugin in ChatGPT, register the remote MCP endpoint in developer mode, then install the package from `plugins/styleguide-fyi/` following the [OpenAI plugin testing guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## Shell tool

The additional `exec` tool uses Just Bash in a browser Web Worker. The virtual files are generated from `src/data/styleguide.ts`: `/guide/styleguide.md`, `/guide/index.json`, `/guide/consensus.json`, `/guide/sections/*.md`, and `/guide/rules/*.md`. Start with `cat /guide/README.md`.

Each call starts a fresh shell in `/guide`. An adapter rejects all filesystem writes, including redirections and in-place edits. Only selected text/query commands are registered; network and external runtimes are disabled. The page does not persist command history or add command telemetry. Tool results are returned to the calling agent.

The shell accepts up to 4096 characters, with a 3-second execution deadline, a 64 KiB output limit and a separate 10-second worker deadline that includes loading. The worker is terminated after each call. Just Bash's browser package is loaded on first execution; version 3.4.2 still imports `node:zlib`, so the browser build maps that import to an explicit unsupported-compression adapter. The virtual guide contains only plain text.

```bash
pnpm deploy:preview
node scripts/verify-webmcp.mjs https://styleguidefyi-shell.steventsao.workers.dev/
```

`wrangler.preview.jsonc` deploys a separate `styleguidefyi-shell` Worker with a workers.dev address and no custom-domain routes. `pnpm run deploy` targets production. Both deployments expose all five tools.

### Verify returned values

`scripts/fixtures/exec-cases.json` contains reviewed inputs and complete expected `{ stdout, stderr, exitCode }` values for 15 cases. `scripts/fixtures/guide-tool-cases.json` preserves the four existing tools' complete results, captured from main before the addition. The unit tests call the real implementations, and the live verifier checks all five tools through Chrome's WebMCP API (19 calls total). Both compare the entire result, including whitespace, error text and unexpected fields; matching a snippet is not enough.

```bash
pnpm test
node scripts/verify-webmcp.mjs
# Optional: choose a deployment and capture path.
node scripts/verify-webmcp.mjs https://styleguidefyi-shell.steventsao.workers.dev/ --output .webmcp-results/preview.json
```

The verifier saves full inputs and returned values to `.webmcp-results/latest.json` before checking them, including failed results. These local captures are gitignored. It never updates the expected fixtures automatically: when an intentional guide or tool change affects a result, review and edit that expectation in the same PR. Tests also check that extra/truncated output, missing newlines, stderr changes, wrong exit codes, extra result fields, and missing/duplicate calls fail verification.

## Reviewer assessments

The compatibility-style table shows individual positions, with a rationale behind each rating. It does not claim consensus on behalf of both reviewers. Astra and Fable each filled their own column on 2026-09-17; each rating records the fingerprint of the wording it assessed, so a later edit shows as Needs review until that reviewer reassesses it. Not rated is distinct from a Neutral assessment.

| Rating | Meaning |
| --- | --- |
| Strongly agree | I would adopt this wording as a useful default. |
| Somewhat agree | I support the direction with the qualifications in my rationale. |
| Neutral | I have no general preference; context decides. |
| Somewhat disagree | I would revise the wording before adopting it. |
| Strongly disagree | I would reject the rule as written. |

Assessments live alongside each rule in `src/data/styleguide.ts`. Each reviewer edits only their own `reviews` entry, including the rating, rationale, review date and `reviewedHash` from `ruleFingerprint(rule)` in `src/lib/consensus.ts`. Compute that fingerprint after reading the current rule; do not refresh another reviewer's fingerprint. Changes to the rule's wording, examples or sources mark earlier assessments **Needs review** until their author reassesses them. Other reviewers' ratings do not invalidate a review.

The same data is available at `/consensus.json` and through `exec` at `/guide/consensus.json`. Missing reviews remain `null`; existing reviews include a `current` or `outdated` status. The rule markdown stays suitable for copying into `AGENTS.md` without the review discussion.

## Reference catalog

Full-text captures are available at `/library`, with a machine-readable index at `/mirrors.json`. Routes use `/org/repository/document`, with `/google/typescript` as a short alias. Each capture has `.source.txt` and `.capture.json` companions. See [capture and refresh instructions](content/mirrors/README.md) for provenance, licenses and how to add sources.

The catalog in `src/data/references.ts` is research material, separate from the adopted rules and reviewer assessments. The page and both reference endpoints use that source. The existing rule Markdown and five WebMCP tools continue to expose the guide; the catalog is available through the separate HTTP endpoints.

Entries distinguish sources already cited by this project from references suggested for reading. Related rule links show topic overlap, not historical influence. A citation or a reviewer rating is not proof that Codex or Fable automatically follows an external guide. The catalog documents Codex's public instruction mechanism and limits Fable claims to this repository's public review evidence.

For additions, read the primary source, record the check date, explain how someone would apply and verify the advice, and include scope limits or conflicts. Use original summaries and public links. Keep private instructions, local paths, credentials and session transcripts out of catalog data. Cataloging a source does not adopt its conventions or install its tools.

## Contributing

People and coding agents are welcome to open a pull request supporting, refining or challenging a rule. Explain your position so another contributor can evaluate it:

- Name the rule ids you agree or disagree with and explain why. Agreement is useful when it adds a reason or example; disagreement should include a concrete counterexample or trade-off.
- Propose wording that says when the rule applies. Distinguish a general default from a language, framework or project convention.
- Edit rules in `src/data/styleguide.ts`, the source for the page, markdown and WebMCP responses. Keep existing rule and section ids stable so links and lookups continue to work.
- Cite a source when a rule rests on published evidence or a known incident. Add it to the rule's `references`; the page and the markdown show it.
- Run `pnpm test`, `pnpm typecheck` and `pnpm build`. Describe the checks you ran and any limits in the PR.

Use the PR discussion to resolve disagreements. An agent's contribution is a proposal for review; consensus is something to work toward, not something a contributor can declare on behalf of others.

## Stack

Static [Astro](https://astro.build) reading pages, served by Cloudflare Workers static assets. The guide lives in `src/data/styleguide.ts`; the page, the markdown file and the WebMCP tools all read from it. A small Worker handles newsletter POST requests using Cloudflare D1. Preview and production use separate databases.

## Blog and search

`/blog` contains original articles; `/rss.xml` exposes published entries. Add a Markdown file in `src/content/blog/` with `title`, `description`, `published`, `category`, and `relatedRules` frontmatter, following the existing articles. Set `draft: true` while preparing a post. Future and draft articles have no public route or feed entry. Add `updated` only for a substantive revision; publication dates are not reset during builds. Keep slugs stable after publication.

Articles are fully rendered HTML with canonical URLs, bylines, publication dates, article and breadcrumb JSON-LD, related rules, and RSS discovery. The sitemap excludes aliases, duplicate Markdown downloads, 404, and unsubscribe actions. Existing guide anchors and agent tools keep their public contracts. `pnpm verify:site <origin>` checks article content against the build, schema, RSS, sitemap coverage, and internal article links as well as the guide and captures.

## Newsletter launch list

The signup works using Cloudflare only. `src/newsletter/worker.ts` validates same-origin form posts, checks explicit consent, applies a 10-request-per-minute limiter per IP per Cloudflare location, and uses parameterized D1 statements. Shared networks can share this allowance. Bodies are limited to 4 KiB; a honeypot rejects basic bot submissions. These are basic abuse controls, not proof of a human or email ownership.

Addresses are normalized and stored once, with a timestamp, consent version, and SHA-256 hash of a random private unsubscribe token. Only a newly inserted signup receives its link; duplicate signups leave the original token intact and do not expose it. Save the link from the first signup. Opening it does not mutate state; its POST confirmation removes the matching row. There is no public subscriber-read or export API, but a caller can infer whether an address is already present from whether a new link is returned; this is a limitation of this initial signup flow. The worker never logs submitted addresses. Forms exclude autocapture, recordings mask inputs, and private pages load no analytics.

**Email sending is not configured.** Signups are a launch list with `status = 'pending'`, not verified subscribers. Before sending a newsletter, configure a sender, email ownership confirmation, bounce handling, and email unsubscribe links. Confirm addresses before regular campaigns. Do not change pending rows to confirmed merely because the form was submitted. See `/privacy` for the reader-facing explanation.

```bash
pnpm newsletter:migrate:local
pnpm build
pnpm exec wrangler dev --local --port 4321
# In a second terminal; creates and removes one reserved test address.
pnpm verify:newsletter http://127.0.0.1:4321 --allow-write
pnpm deploy:preview
pnpm verify:newsletter https://styleguidefyi-shell.steventsao.workers.dev --allow-write
```

Deploy commands apply additive migrations before uploading the Worker. CI does the same before production deployment; its Cloudflare token now also needs D1 edit access to the configured database. Inspect subscriber data only through authorized Cloudflare administration. Never paste addresses or export files into this public repository. Preview responses include `X-Robots-Tag: noindex, nofollow` and keep production canonical URLs.

## Commands

Use Node 24 and pnpm 10.34.5 (pinned in `package.json`).

```bash
pnpm install
pnpm test
pnpm run deploy
node scripts/verify-webmcp.mjs   # checks all five tools on production through real Chrome
```

To try the tools in your own Chrome (149+): enable `chrome://flags/#enable-webmcp-testing`, then open the site with the Model Context Tool Inspector extension.

## Continuous integration and deployment

[Check and deploy](.github/workflows/ci-deploy.yml) runs on pull requests targeting `main`, every push to `main`, and manual dispatch. PR checks install the frozen lockfile, run unit tests and typecheck, build the static site, and verify its HTTP routes through the local Cloudflare runtime. Deployment credentials are used only by the separate production job on `main`.

After the checks pass on `main`, the workflow deploys the exact verified `dist/` artifact with Wrangler, then checks production against the built guide/catalog data, captured-source and license hashes, canonical URLs, download headers, section links and 404 behavior. `/deployment.json` reports the deployed commit and build time with `Cache-Control: no-store`; the production check must match the workflow's commit. Main runs are serialized and PR checks can cancel superseded PR runs. Actions are pinned to full commit hashes.

The repository needs an Actions secret named `CLOUDFLARE_API_TOKEN` and an Actions variable named `CLOUDFLARE_ACCOUNT_ID`. Use a dedicated [Cloudflare Workers deployment token](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) scoped to the deployment account and applicable zone; never commit its value or use an interactive OAuth login token in CI. Missing credentials cause an explicit failed deployment. The `production` GitHub environment records deployments.

One-time setup in [GitHub Actions settings](https://github.com/steventsao/styleguidefyi/settings/secrets/actions):

1. Set `CLOUDFLARE_ACCOUNT_ID` as a repository variable for the deployment account.
2. Save a dedicated Cloudflare API token as the repository secret `CLOUDFLARE_API_TOKEN`. Scope it to the deployment account and `styleguide.fyi` zone, with Workers deployment access, D1 edit access for migrations, and Workers Routes write access for the configured custom domains.
3. Push or merge to `main`. For a previously failed deployment, choose **Re-run failed jobs** on the latest main workflow to reuse that run's verified artifact.

The production job checks credentials before installing dependencies or modifying Cloudflare. Each successful main run applies the newsletter migration, deploys the verified site artifact and plugin Worker, and checks both live endpoints. Pull request runs never deploy production.

Validate a preview before merging with `pnpm deploy:preview`. To verify an existing build against a deployment, run `pnpm verify:site https://styleguide.fyi --commit <full-sha>`. The existing Chrome WebMCP verifier remains required after tool changes; the HTTP check does not replace browser tool execution.
