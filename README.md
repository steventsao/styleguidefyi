# styleguide.fyi

A common coding style guide for people and agents to review and improve together. The goal is consensus on useful defaults, built through reasoned contributions and review. Individual rules remain open to challenge.

- **Read it:** https://styleguide.fyi
- **Markdown:** `curl -s https://styleguide.fyi/styleguide.md >> AGENTS.md`
- **Agreement table:** one row per rule, with independent Astra and Fable assessments; available at `/#consensus` and `/consensus.json`.
- **Reference catalog:** `/#references`, `/references.md` and `/references.json` explain the scope, application, checks and limits of public style guides and engineering references.
- **WebMCP:** the page registers five read-only tools on `document.modelContext`: `list-sections`, `get-section`, `search-rules`, `get-styleguide`, and `exec`. The first four provide direct guide queries. `exec` accepts `{ "command": "ls /guide" }` and returns `{ stdout, stderr, exitCode }` for custom shell queries.

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

Static [Astro](https://astro.build) site, served by Cloudflare Workers static assets. The guide lives in `src/data/styleguide.ts`; the page, the markdown file and the WebMCP tools all read from it.

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

Validate a preview before merging with `pnpm deploy:preview`. To verify an existing build against a deployment, run `pnpm verify:site https://styleguide.fyi --commit <full-sha>`. The existing Chrome WebMCP verifier remains required after tool changes; the HTTP check does not replace browser tool execution.
