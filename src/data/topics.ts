/**
 * Page copy for the topic pages at /topics/<section-id>. The rules themselves stay in
 * `styleguide.ts`; this file only says how each section is introduced to a reader who
 * arrives from a search rather than from the guide.
 */
export interface Topic {
	/** The page heading and title: what a person would type to find these rules. */
	heading: string;
	/** One or two sentences on what the rules in this section are for. */
	intro: string;
}

export const topics: Record<string, Topic> = {
	"read-first": {
		heading: "Rules for reading code before you change it",
		intro: "Most bad changes start from a wrong picture of the code. These rules cover the work before the first edit: learn the local conventions, look for what already exists, and establish what is failing.",
	},
	scope: {
		heading: "Rules for keeping a change small",
		intro: "A small change is easier to review, to test and to revert. These rules cover what belongs in a diff and what to leave out: refactors, speculative features and dead code.",
	},
	naming: {
		heading: "Naming rules for variables, functions and booleans",
		intro: "A name is read far more often than it is written. These rules cover domain words, name length, booleans, units and using one word for one concept.",
	},
	functions: {
		heading: "Rules for writing functions",
		intro: "These rules keep a function easy to call and safe to change: one job, early returns, clear arguments, logic separated from I/O, and no surprise mutation.",
	},
	"types-and-data": {
		heading: "TypeScript rules for types and data",
		intro: "Types can rule out whole classes of bugs when the data is checked once and modeled precisely. These rules cover parsing at the boundary, modeling states, `any`, immutability and named constants.",
	},
	errors: {
		heading: "Error handling rules",
		intro: "An error that disappears costs more than an error that crashes. These rules cover swallowed errors, failing fast, fallbacks, where to catch, and what an error message should say.",
	},
	concurrency: {
		heading: "Rules for timeouts, retries and concurrency",
		intro: "Calls to other systems fail slowly, fail partially and get repeated. These rules cover timeouts, retries with backoff, idempotency, unawaited promises, cancellation, races and measuring time. Each one cites its published source.",
	},
	comments: {
		heading: "Rules for code comments",
		intro: "A comment should tell the reader what the code cannot. These rules cover what to explain, what to leave to version control, how to write a TODO, and documenting a public contract.",
	},
	tests: {
		heading: "Rules for writing tests",
		intro: "A test is worth having when it fails for a real defect and only then. These rules cover testing behavior, proving a regression test works, naming, fakes, flaky tests and never weakening a test to make it pass.",
	},
	structure: {
		heading: "Rules for dependencies and project structure",
		intro: "These rules cover the decisions that shape a codebase over years: when to add a dependency, where files go, which way imports point, and where configuration comes from.",
	},
	commits: {
		heading: "Rules for commits and code review",
		intro: "A commit history is documentation that reviewers and future maintainers read. These rules cover atomic commits, commit messages, reviewing your own diff, and what must stay out of the repository.",
	},
	agents: {
		heading: "Rules for working with AI coding agents",
		intro: "A coding agent writes code quickly and reports confidently, so its work needs the same checks as anyone else's. These rules cover verifying before claiming success, honest reporting, destructive actions, prompt injection through tool output, and instruction files.",
	},
};
