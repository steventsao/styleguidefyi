import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RESOURCE_MIME_TYPE, registerAppResource, registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { OpenAIExtensions } from "@openai/mcp-extensions/server";
import type { OpenAIUiResourceMetadata, OpenAIUiToolMetadata } from "@openai/mcp-extensions/server";
import { z } from "zod";
import { styleguide } from "../data/styleguide";
import { countRules, styleguideToMarkdown } from "../lib/styleguide";
import { guideOverview, mentionRules, PLUGIN_GUIDE_URI, ruleDetail, searchGuideRules, sectionDetail } from "./catalog";
import { PLUGIN_APP_HTML } from "./app.generated";

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const ICON = { src: "https://styleguide.fyi/plugin-icon.svg", mimeType: "image/svg+xml", sizes: ["any"] };

function notFound(kind: string, id: string, valid: string[]) {
	const message = `Unknown ${kind} "${id}". Choose one of: ${valid.join(", ")}.`;
	return {
		isError: true,
		content: [{ type: "text" as const, text: message }],
		structuredContent: { kind: "error", message },
	};
}

export function createStyleguideServer() {
	const server = new McpServer(
		{ name: "styleguide.fyi", version: "1.0.0", icons: [ICON] },
		{
			instructions: "This public guide offers proposed coding defaults, not project policy. Use search_rules to find relevant rules, then get_rule for exact wording and examples. Cite the returned rule URL. Apply a rule only when it fits the user's codebase and instructions.",
		},
	);
	const extensions = new OpenAIExtensions(server);

	registerAppResource(server, "Coding style guide", PLUGIN_GUIDE_URI, {}, async () => ({
		contents: [{
			uri: PLUGIN_GUIDE_URI,
			mimeType: RESOURCE_MIME_TYPE,
			text: PLUGIN_APP_HTML,
			_meta: {
				"openai/ui": {
					preferredDisplayMode: "fullscreen",
					availableDisplayModes: ["inline", "fullscreen"],
				} satisfies OpenAIUiResourceMetadata,
			},
		}],
	}));

	registerAppTool(server, "browse_guide", {
		title: "Coding Style Guide",
		description: "Open the styleguide.fyi rule library in the sidebar or beside a conversation.",
		inputSchema: {},
		annotations: READ_ONLY,
		_meta: {
			ui: { resourceUri: PLUGIN_GUIDE_URI, visibility: ["app"] },
			"openai/ui": { entrypoints: [{ type: "global" }, { type: "thread" }] } satisfies OpenAIUiToolMetadata,
		},
	}, async () => ({
		content: [{ type: "text", text: `${styleguide.title}: ${countRules(styleguide)} rules in ${styleguide.sections.length} sections.` }],
		structuredContent: guideOverview(),
	}));

	registerAppTool(server, "get_rule", {
		title: "Read a Coding Rule",
		description: "Read the exact wording, rationale, examples, review status, and source URL for one styleguide.fyi rule ID.",
		inputSchema: { id: z.string().describe("Stable rule ID from search_rules or browse_guide") },
		annotations: READ_ONLY,
		_meta: {
			ui: { resourceUri: PLUGIN_GUIDE_URI, visibility: ["model", "app"] },
			"openai/ui": { preferredModelDisplayMode: "inline" } satisfies OpenAIUiToolMetadata,
		},
	}, async ({ id }) => {
		const result = ruleDetail(id);
		if (!result) return notFound("rule", id, styleguide.sections.flatMap((section) => section.rules.map((rule) => rule.id)));
		return {
			content: [{ type: "text", text: `${result.rule.markdown}\n\nSource: ${result.rule.url}` }],
			structuredContent: result,
		};
	});

	registerAppTool(server, "get_section", {
		title: "Read a Style Guide Section",
		description: "Read all rules and code examples in one section, using its stable section ID.",
		inputSchema: { id: z.string().describe("Section ID from browse_guide") },
		annotations: READ_ONLY,
		_meta: {
			ui: { resourceUri: PLUGIN_GUIDE_URI, visibility: ["model", "app"] },
			"openai/ui": { preferredModelDisplayMode: "inline" } satisfies OpenAIUiToolMetadata,
		},
	}, async ({ id }) => {
		const result = sectionDetail(id);
		if (!result) return notFound("section", id, styleguide.sections.map((section) => section.id));
		return {
			content: [{ type: "text", text: `${result.section.markdown}\n\nSource: ${styleguide.url}/#${result.section.id}` }],
			structuredContent: result,
		};
	});

	registerAppTool(server, "search_rules", {
		title: "Search Coding Rules",
		description: "Find styleguide.fyi coding rules by keywords in titles, rationales, and examples. Returns stable IDs and source URLs; use get_rule for exact text.",
		inputSchema: { query: z.string().max(120).describe("Keywords, such as error handling or boolean names") },
		annotations: READ_ONLY,
		_meta: {
			ui: { resourceUri: PLUGIN_GUIDE_URI, visibility: ["model", "app"] },
			"openai/ui": { preferredModelDisplayMode: "inline" } satisfies OpenAIUiToolMetadata,
		},
	}, async ({ query }) => {
		const result = searchGuideRules(query);
		return {
			content: [{
				type: "text",
				text: result.matches.length
					? result.matches.map((rule) => `${rule.title} (${rule.id}) — ${rule.url}\n${rule.why}`).join("\n\n")
					: `No rules matched "${result.query}". Try a broader term.`,
			}],
			structuredContent: result,
		};
	});

	server.registerTool("get_styleguide", {
		title: "Read the Complete Coding Style Guide",
		description: "Get the full public styleguide.fyi coding guide as Markdown, including every rule, rationale, and example. Use when the user asks for the whole guide; prefer focused tools for one topic.",
		inputSchema: {},
		annotations: READ_ONLY,
	}, async () => ({
		content: [{ type: "text", text: styleguideToMarkdown(styleguide) }],
	}));

	extensions.mentions.setHandler(async ({ query }) => ({ items: mentionRules(query) }));
	return server;
}
