export interface CatalogSource {
	title: string;
	url: string;
}

export interface CatalogEntry {
	id: string;
	title: string;
	publisher: string;
	scope: string;
	url: string;
	summary: string;
	use: string;
	check: string;
	limit: string;
	/** A citation is evidence of use by this project, not adoption by an agent. */
	status: "reference-only" | "cited-by-project";
	relatedRules: string[];
	sources: CatalogSource[];
}

export const referenceCatalog = {
	title: "Style guides in practice",
	checkedAt: "2026-09-18",
	intro: "A reading list for people and coding agents: what each guide covers, how to apply it, and where its advice stops.",
	selection: "Selected for primary-source provenance, actionable guidance, and relevance to this TypeScript guide, with Python, Go and Rust for comparison. The order is a suggested reading path, not a popularity ranking or a list of model defaults.",
	evidence: "A public citation shows that a project uses a source. A reviewer rating records agreement with a particular rule. Neither proves that an agent automatically follows an entire external guide. No source in this catalog is verified as a universal Codex or Fable default.",
	agentUsage: [
		{
			name: "Codex",
			status: "Documented instruction mechanism",
			text: "Codex reads AGENTS.md guidance at startup, combining global instructions with project instructions down to the working directory. More specific project guidance can override earlier project guidance. Skills load their full instructions when selected. Name the adopted rules and ask the agent to read the relevant source; a catalog link alone does not demonstrate that it was loaded or followed.",
			sources: [
				{ title: "OpenAI: custom instructions with AGENTS.md", url: "https://learn.chatgpt.com/docs/agent-configuration/agents-md" },
				{ title: "OpenAI: build skills", url: "https://learn.chatgpt.com/docs/build-skills" },
			],
		},
		{
			name: "Fable",
			status: "Project review evidence only",
			text: "Fable is the reviewer name used in this repository. Its published assessments include a rationale, date and fingerprint of the rule text. This establishes a review record, not a vendor identity, instruction-loading mechanism, training source or external guide preference. Check the current consensus data for changed wording; adoption of these external guides remains unverified.",
			sources: [
				{ title: "Published reviewer data", url: "https://styleguide.fyi/consensus.json" },
				{ title: "Public review implementation at the catalog baseline", url: "https://github.com/steventsao/styleguidefyi/blob/59988067b23a2b274701d01e23b041d9c2e733b5/src/lib/consensus.ts" },
			],
		},
	],
	adoption: [
		{ title: "Choose the scope", text: "Read the repository instructions, nearby code and checked-in tool configuration. Select the relevant language guide or engineering topic and record any local exceptions. A correctness or security defect still needs a fix." },
		{ title: "Write down the decision", text: "Put a short, explicit rule, its scope and a source link in the instruction file the agent actually reads. Keep this catalog as reference material. For a repeatable review workflow, a skill can hold the procedure and load supporting documents when needed." },
		{ title: "Assign a check", text: "Use the existing formatter for layout, a linter or type checker for mechanically detectable issues, tests for behavior, and review for design trade-offs. A prose guide does not install or configure any of those tools." },
		{ title: "Verify the result", text: "Ask the agent to identify the instruction files and source sections it read, explain conflicts, run the project checks, and show the relevant diff. Record the revision and check results. Self-reported agreement alone is not a conformance test." },
	],
	conflict: {
		title: "Resolve conflicts before adopting a guide",
		text: "Google TypeScript requires named exports; Airbnb JavaScript prefers a default export for a module with a single export. A TypeScript project must choose its convention and document framework exceptions. Asking an agent to obey both guides wholesale leaves a real contradiction.",
		sources: [
			{ title: "Google: exports", url: "https://google.github.io/styleguide/tsguide.html#exports" },
			{ title: "Airbnb: modules, rule 10.6", url: "https://github.com/airbnb/javascript#modules--prefer-default-export" },
		],
	},
	/** An illustrative policy for another project; cataloging does not adopt it here. */
	example: `## Example policy for a TypeScript project

- Read the repository instructions and adjacent code before editing.
- For application modules, use named exports. Keep default exports where the framework requires them.
- Consult Google's TypeScript guide for the relevant topic:
  https://google.github.io/styleguide/tsguide.html
- Keep the repository's existing formatter settings; do not reformat unrelated code.
- Run the documented type, lint and behavior checks that apply to the change.
- In the review, cite the adopted rule, explain any exception, and report the checks actually run.`,
	entries: [
		{
			id: "google-typescript",
			title: "Google TypeScript Style Guide",
			publisher: "Google",
			scope: "TypeScript conventions",
			url: "https://google.github.io/styleguide/tsguide.html",
			summary: "A detailed reference for types, imports, exports, naming and language features. Start here for this site's TypeScript examples.",
			use: "Select the relevant sections and state local exceptions. For example, adopt named exports for application modules while retaining framework-required default exports.",
			check: "Use the project's TypeScript checks and compatible lint rules; review API and naming choices in the diff.",
			limit: "The authors explicitly warn that Google's environment has different constraints. Example formatting is not automatically a rule, and the guide may not fit every external project.",
			status: "reference-only",
			relatedRules: ["no-any", "immutable-by-default", "one-direction-imports"],
			sources: [],
		},
		{
			id: "google-code-review",
			title: "Google Engineering Practices: Code Review",
			publisher: "Google",
			scope: "Review method",
			url: "https://google.github.io/eng-practices/review/reviewer/looking-for.html",
			summary: "A review checklist covering design, behavior, complexity, tests, naming, comments and documentation.",
			use: "Turn the checklist into review questions tied to the actual diff. Ask whether the feature works, whether the complexity is needed, and whether its tests catch a failure.",
			check: "Require concrete findings and inspect behavior where it matters. Keep optional style preferences distinct from defects or adopted project requirements.",
			limit: "Google's policy gives its adopted style guides authority. That organizational policy is not evidence that an unrelated repository has adopted the same guides.",
			status: "reference-only",
			relatedRules: ["no-speculative-code", "comment-why", "review-your-own-diff", "failing-test-first"],
			sources: [],
		},
		{
			id: "airbnb-javascript",
			title: "Airbnb JavaScript Style Guide",
			publisher: "Airbnb",
			scope: "JavaScript conventions",
			url: "https://github.com/airbnb/javascript",
			summary: "Concrete JavaScript examples, rationales and links to lint rules make individual conventions easy to discuss and adopt.",
			use: "Choose specific rules for a JavaScript project. Compare them with the project's existing parser, framework and lint configuration before enabling a preset.",
			check: "Run the compatible lint configuration actually installed in the repository, then review behavior separately. Reading the guide does not enable its ESLint rules.",
			limit: "Its preference for default exports in single-export modules conflicts with Google's TypeScript policy. It is not a complete TypeScript policy or a verified agent default.",
			status: "reference-only",
			relatedRules: ["no-hidden-mutation", "immutable-by-default", "name-what-it-is"],
			sources: [],
		},
		{
			id: "prettier",
			title: "Prettier: Rationale and Linters",
			publisher: "Prettier",
			scope: "Formatting tool guidance",
			url: "https://prettier.io/docs/rationale.html",
			summary: "Explains what an automatic formatter decides and why formatting and code-quality checks have different jobs.",
			use: "When a project already uses Prettier, have the agent run its checked-in formatting command and preserve its configuration.",
			check: "Use the project's formatting check in CI. Use its linter, type checker and tests to cover issues that formatting cannot detect.",
			limit: "Prettier does not validate architecture, naming, security or program correctness. Listing it here does not add it to this project's dependencies.",
			status: "reference-only",
			relatedRules: ["match-the-codebase", "no-drive-by-refactors"],
			sources: [{ title: "Prettier vs. Linters", url: "https://prettier.io/docs/comparison" }],
		},
		{
			id: "pep-8",
			title: "PEP 8 — Style Guide for Python Code",
			publisher: "Python",
			scope: "Python conventions",
			url: "https://peps.python.org/pep-0008/",
			summary: "A Python reference for readability, naming, imports, whitespace and consistency, with explicit room for project context.",
			use: "Use it when working in Python. Record the project's line-length and formatting choices, and follow its existing conventions when applying a general recommendation would reduce readability.",
			check: "Run the configured Python formatter and linter, then review public names and compatibility. State which rules the tools enforce.",
			limit: "PEP 8 prioritizes project and local consistency and warns against breaking compatibility to satisfy style. It does not require every team to use an identical tool configuration.",
			status: "reference-only",
			relatedRules: ["match-the-codebase", "name-what-it-is", "document-contracts"],
			sources: [],
		},
		{
			id: "effective-go",
			title: "Effective Go",
			publisher: "The Go project",
			scope: "Go idioms and formatting",
			url: "https://go.dev/doc/effective_go",
			summary: "Explains Go naming, interfaces, error handling and control flow, with gofmt taking care of layout.",
			use: "Use its examples to write idiomatic Go rather than translating another language's conventions. Let gofmt determine formatting and review the remaining design choices.",
			check: "Run the repository's Go formatting and test commands; inspect error handling, ownership and API use in context.",
			limit: "The page says it is not actively updated and does not cover later additions such as generics and modules. Use current Go documentation for those topics.",
			status: "reference-only",
			relatedRules: ["length-tracks-scope", "return-early", "handle-where-you-can-act"],
			sources: [],
		},
		{
			id: "rust-style",
			title: "The Rust Style Guide",
			publisher: "The Rust project",
			scope: "Rust formatting",
			url: "https://doc.rust-lang.org/style-guide/",
			summary: "Defines Rust's default formatting conventions and serves as a reference for tools such as rustfmt.",
			use: "Have the agent use the repository's rustfmt configuration and toolchain. Reserve review time for decisions formatting cannot make.",
			check: "Run the project's format check, compiler checks and relevant tests. Review API contracts and ownership separately.",
			limit: "This is a formatting guide, not a complete Rust API, safety or ownership guide. It permits non-default styles and tool configuration.",
			status: "reference-only",
			relatedRules: ["match-the-codebase", "no-drive-by-refactors"],
			sources: [],
		},
		{
			id: "typescript-contributors",
			title: "TypeScript Contributor Coding Guidelines",
			publisher: "Microsoft / TypeScript",
			scope: "One repository's conventions",
			url: "https://github.com/microsoft/TypeScript/wiki/Coding-guidelines",
			summary: "A useful example of a team defining precise conventions for contributors to its own codebase.",
			use: "Consult it when contributing to TypeScript itself. Elsewhere, study how its rules are scoped and justify any convention your team chooses to borrow.",
			check: "Follow the target repository's contribution instructions and checks. Keep an explicit record of any borrowed rules and exceptions.",
			limit: "The page explicitly says it is not a prescriptive guideline for the TypeScript community. Microsoft authorship does not make it a universal application style.",
			status: "reference-only",
			relatedRules: ["match-the-codebase", "write-the-rules-down"],
			sources: [],
		},
		{
			id: "google-sre",
			title: "Addressing Cascading Failures",
			publisher: "Google, Site Reliability Engineering",
			scope: "Reliability engineering",
			url: "https://sre.google/sre-book/addressing-cascading-failures/",
			summary: "Explains how overload and dependency failures spread. This project already cites it in its rule about bounded waits.",
			use: "When reviewing dependency calls, ask what happens as latency rises, how much work can accumulate, and how the caller's deadline constrains the request.",
			check: "Exercise slow or unavailable dependencies and inspect resource use. Check that timeouts and overload handling bound work under the service's real constraints.",
			limit: "Engineering evidence supports specific reliability decisions; it is not a formatting guide or proof that an agent follows Google's entire engineering policy.",
			status: "cited-by-project",
			relatedRules: ["bound-every-wait"],
			sources: [],
		},
		{
			id: "amazon-retries",
			title: "Timeouts, retries, and backoff with jitter",
			publisher: "Marc Brooker, Amazon Builders' Library",
			scope: "Reliability engineering",
			url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/",
			summary: "Explains timeout selection, retry amplification, idempotency and jitter. This project already cites it in its rule about bounded waits.",
			use: "Before adding retries, identify the layer that owns them, the existing SDK policy and whether repeating the operation is safe. Choose a timeout from dependency latency and the caller's budget.",
			check: "Test transient failures and ambiguous responses. Verify bounded attempts, elapsed time and duplicate-side-effect handling; successful retries alone do not prove safety.",
			limit: "Timeout and retry values depend on the service. The article is operational guidance, not a universal retry wrapper or a coding-agent default.",
			status: "cited-by-project",
			relatedRules: ["bound-every-wait", "retry-with-backoff", "idempotent-before-retry"],
			sources: [{ title: "Amazon's published article (PDF)", url: "https://d1.awsstatic.com/builderslibrary/pdfs/timeouts-retries-and-backoff-with-jitter.pdf" }],
		},
	] satisfies CatalogEntry[],
};
