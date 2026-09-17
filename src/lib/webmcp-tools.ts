import type { Styleguide } from "../data/styleguide";
import { countRules, ruleToMarkdown, searchRules, sectionToMarkdown, styleguideToMarkdown } from "./styleguide";

/** A tool in the shape `document.modelContext.registerTool()` accepts. */
export interface WebMcpTool {
	name: string;
	title: string;
	description: string;
	inputSchema: Record<string, unknown>;
	annotations: { readOnlyHint: boolean };
	execute: (input: Record<string, unknown>) => Promise<unknown>;
}

/** What the tools may do to the visible page. Kept abstract so the tools run without a DOM. */
export interface PageActions {
	revealSection(sectionId: string): void;
	filterRules(query: string): void;
}

const MAX_SEARCH_RESULTS = 10;

// WebMCP drops the reason of a rejected `execute` promise, so the agent would only see
// "UnknownError". Problems the agent can correct are returned as values instead.
function correctableError(message: string, extra: Record<string, unknown> = {}) {
	return { error: message, ...extra };
}

export function createTools(guide: Styleguide, page: PageActions): WebMcpTool[] {
	const sectionIds = guide.sections.map((section) => section.id);
	const ruleCount = countRules(guide);

	return [
		{
			name: "list-sections",
			title: "List style guide sections",
			description:
				`List the ${guide.sections.length} sections of ${guide.title}, each with its id, title, summary and rule titles. ` +
				"Call this first to find the section that covers a topic, then call get-section with its id.",
			inputSchema: { type: "object", properties: {} },
			annotations: { readOnlyHint: true },
			execute: async () => ({
				title: guide.title,
				updated: guide.updated,
				sections: guide.sections.map((section) => ({
					id: section.id,
					title: section.title,
					summary: section.summary,
					rules: section.rules.map((rule) => rule.title),
				})),
			}),
		},
		{
			name: "get-section",
			title: "Get one section",
			description:
				"Get every rule in one section of the style guide as markdown, with the rationale and the avoid/prefer code examples. " +
				"Use it to review or write code in one area, such as naming, errors or tests. It also scrolls the page to the section.",
			inputSchema: {
				type: "object",
				properties: {
					section: {
						type: "string",
						enum: sectionIds,
						description: "Section id, as returned by list-sections.",
					},
				},
				required: ["section"],
			},
			annotations: { readOnlyHint: true },
			execute: async ({ section: sectionId }) => {
				const section = guide.sections.find((candidate) => candidate.id === sectionId);
				if (!section) {
					return correctableError(`Unknown section "${String(sectionId)}".`, { validSections: sectionIds });
				}
				page.revealSection(section.id);
				return sectionToMarkdown(section);
			},
		},
		{
			name: "search-rules",
			title: "Search rules",
			description:
				'Find style guide rules by keyword, for example "error handling", "boolean names" or "mocks". ' +
				`Returns up to ${MAX_SEARCH_RESULTS} rules that contain every word, best match first, each with its id, URL and full markdown. ` +
				"It also filters the visible page to the matches.",
			inputSchema: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "One or more keywords. A rule must contain all of them.",
					},
				},
				required: ["query"],
			},
			annotations: { readOnlyHint: true },
			execute: async ({ query }) => {
				if (typeof query !== "string" || query.trim() === "") {
					return correctableError('"query" must be a non-empty string, for example "error handling".');
				}
				const matches = searchRules(guide, query);
				page.filterRules(query);

				const rulesById = new Map(guide.sections.flatMap((section) => section.rules).map((rule) => [rule.id, rule]));
				return {
					query,
					totalMatches: matches.length,
					rules: matches.slice(0, MAX_SEARCH_RESULTS).map((match) => ({
						id: match.id,
						section: match.section,
						url: match.url,
						markdown: ruleToMarkdown(rulesById.get(match.id)!),
					})),
				};
			},
		},
		{
			name: "get-styleguide",
			title: "Get the complete style guide",
			description:
				`Get the complete style guide (${ruleCount} rules) as one markdown document. ` +
				"Use it to save the guide as AGENTS.md or CLAUDE.md, or to follow it as coding instructions for the rest of a session.",
			inputSchema: { type: "object", properties: {} },
			annotations: { readOnlyHint: true },
			execute: async () => styleguideToMarkdown(guide),
		},
	];
}
