# SEO strategy

Written 2026-11-09. Review it when Search Console has eight weeks of data for the pages added here.

## Where the site stands

Measured in PostHog (project `styleguidefyi`), production host only, automated browsers and local development excluded:

| Period | Human pageviews | From search engines |
| --- | --- | --- |
| 2026-09-29 to 2026-11-09 | about 72 | about 15 (Bing 8, Google 6, DuckDuckGo 1) |

The home page and the design-system pages received almost all of it. Search Console data was not available when this was written, so there are no impression or query numbers behind this plan. Keyword demand below is judged from reading result pages, not from volume data.

Before this change the site had about 40 indexable pages, and the 59 rules shared one URL. A search for one rule's subject could only land on the home page, where that rule is one of 59.

One defect was found and fixed with this change. Canonical URLs, the sitemap and internal links all use paths with no trailing slash, but the server answered each of those with a 307 redirect to the slash form. Search engines were given canonical URLs that redirect. `html_handling: "drop-trailing-slash"` in both Wrangler configs now serves the no-slash form directly and redirects the slash form to it.

## Position

The site will not outrank the Airbnb or Google guides for their own names, and it will not win "coding style guide" as a head term. It can win three narrower things:

1. **One specific rule, explained.** Queries such as "typescript unknown vs any", "exponential backoff jitter example" or "boolean naming convention". Each rule now has a page with the reason, an example, sources and two reviewer assessments.
2. **Instruction files for coding agents.** Queries about `AGENTS.md`, `CLAUDE.md` and Cursor rules. Result pages are mostly vendor blogs that describe the file format. Few offer rules to paste in. This site has the rules as Markdown, in a size that fits an instruction file.
3. **Being cited by AI assistants.** Markdown endpoints, `llms.txt` and sourced claims make the pages easy for an assistant to quote. Agent visits already make up about half of raw traffic.

## Structure

| URL | Count | Targets |
| --- | --- | --- |
| `/` | 1 | The guide on one page. Brand and "coding style guide" queries. |
| `/rules` | 1 | Index of every rule. |
| `/rules/<id>` | 59 | One rule: long-tail queries on its subject. |
| `/topics/<section-id>` | 12 | One subject: "error handling rules", "naming rules", "rules for writing tests". |
| `/agents` | 1 | Setup for `AGENTS.md`, `CLAUDE.md`, Cursor and Copilot. |
| `/blog/<slug>` | 7 | Questions that need an argument, not a rule. |
| `/design-systems/<slug>` | 4 | Design-system references (existing). |
| Captured guides | 17 | Existing. Kept for provenance; not a ranking target. |

Rules for the structure:

- Rule and topic pages are generated from `src/data/styleguide.ts`. Topic headings and introductions live in `src/data/topics.ts`. Nothing is written twice.
- Rule ids are permanent. They are URL slugs, anchors and tool lookup keys.
- Every page links up (breadcrumbs), sideways (sibling rules, previous and next) and across (articles that cite the rule, and rules behind each article).
- Each reading page has a Markdown alternate. Markdown files send `X-Robots-Tag: noindex` and stay out of the sitemap, so they do not compete with the pages.
- `/styleguide.compact.md` states every rule in one line. It exists because the full guide is over 700 lines and instruction files work best under 200.

## Content plan

Each article must cite real sources, link to the rules it relies on and say something the rule page does not. Published with this change:

| Article | Target queries |
| --- | --- |
| What to put in AGENTS.md | "what to put in agents.md", "agents.md example" |
| AGENTS.md vs CLAUDE.md | "agents.md vs claude.md", "claude code agents.md" |
| Parse, don't validate, in TypeScript | "parse don't validate typescript", "typescript validate json type" |
| Timeouts, retries and backoff | "retry with exponential backoff typescript", "timeout retry best practices" |

Next, in priority order. Write one or two a week; a steady pace matters more than volume.

1. Cursor rules for TypeScript: what belongs in a rule file. Verify every claim against Cursor's documentation first.
2. `any` vs `unknown` in TypeScript, with narrowing examples.
3. Making illegal states unrepresentable with discriminated unions.
4. Error handling in TypeScript: when to catch, when to let it fail.
5. How to review code written by an AI agent.
6. Naming booleans, units and domain terms: examples from code review.
7. How to write a commit message, with the reason in the body.
8. Flaky tests: causes and fixes.
9. Comparison pages for the captured guides, for example Airbnb vs Google for JavaScript. Original analysis only; the captures stay separate.
10. Design-system comparisons from the existing sourced data, for example Primer vs Carbon tokens.

## Links

Content alone will not rank a six-week-old domain. Each needs an owner and a date:

- Submit the guide to lists that already collect agent rules and style guides (awesome-lists for `AGENTS.md`, Cursor rules and Claude Code).
- Post the compact file and the `/agents` page where agent users ask how to write instruction files. Offer the file; do not post links without context.
- Ask the maintainers of cited sources for nothing. Cite them accurately and let the work be found.

## Measurement

Check monthly:

- Search Console: indexed pages (expect about 100 after this change), impressions and clicks by page group (`/rules/`, `/topics/`, `/agents`, `/blog/`), and the queries each group receives.
- PostHog: human pageviews by page group with `is_automated` excluded, and search-engine referrals.
- Which rule pages get impressions. Write the next article about the subject that already shows demand.

Stop and reconsider if, after three months, rule pages have impressions under 100 a month in total. That would mean the long-tail bet is wrong and effort should move to articles and links.

## Not verified here

- Search Console data. No connector was available.
- Keyword volumes. No keyword tool was available.
- Cursor and GitHub Copilot instruction-file details on `/agents` were not checked against their documentation in the session that wrote the page; their hosts were unreachable. The page states only the file locations and links to the official documentation. Check both before expanding that copy.
