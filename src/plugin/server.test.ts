import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { styleguide } from "../data/styleguide";
import { countRules, ruleToMarkdown } from "../lib/styleguide";
import { PLUGIN_GUIDE_URI } from "./catalog";
import { createStyleguideServer } from "./server";

const server = createStyleguideServer();
const client = new Client({ name: "styleguide-plugin-test", version: "1.0.0" });

beforeAll(async () => {
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await server.connect(serverTransport);
	await client.connect(clientTransport);
});

afterAll(async () => {
	await client.close();
	await server.close();
});

describe("OpenAI plugin MCP server", () => {
	test("advertises the sidebar, conversation panel, model tools, and composer mentions", async () => {
		const { tools } = await client.listTools();
		const byName = new Map(tools.map((tool) => [tool.name, tool]));
		expect([...byName.keys()]).toEqual(expect.arrayContaining([
			"browse_guide", "get_rule", "get_section", "search_rules", "get_styleguide", "search_mentions",
		]));
		expect(byName.get("browse_guide")?._meta?.["openai/ui"]).toMatchObject({
			entrypoints: [{ type: "global" }, { type: "thread" }],
		});
		expect(byName.get("browse_guide")?._meta?.ui).toMatchObject({ visibility: ["app"] });
		expect(byName.get("get_rule")?._meta?.ui).toMatchObject({ visibility: ["model", "app"] });
		expect(byName.get("search_mentions")?._meta?.["openai/extensions"]).toMatchObject({ "mentions/search": {} });
		for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(true);
	});

	test("returns the current guide and a self-contained UI resource", async () => {
		const result = await client.callTool({ name: "browse_guide", arguments: {} });
		expect(result.structuredContent).toMatchObject({
			kind: "overview",
			ruleCount: countRules(styleguide),
			sections: styleguide.sections.map((section) => ({ id: section.id })),
		});
		const resource = await client.readResource({ uri: PLUGIN_GUIDE_URI });
		const content = resource.contents[0];
		const html = content && "text" in content ? content.text : undefined;
		expect(resource.contents[0]?.mimeType).toBe("text/html;profile=mcp-app");
		expect(html).toContain('<div id="app"></div>');
		expect(html).toContain("Add to chat");
		expect(html).not.toMatch(/<script[^>]+src=/);
	});

	test("returns exact rule text, useful search results, and a clear unknown-ID error", async () => {
		const rule = styleguide.sections[0]!.rules[0]!;
		const detail = await client.callTool({ name: "get_rule", arguments: { id: rule.id } });
		expect(detail.content).toContainEqual({ type: "text", text: `${ruleToMarkdown(rule)}\n\nSource: ${styleguide.url}/#${rule.id}` });
		expect(detail.structuredContent).toMatchObject({ kind: "rule", rule: { id: rule.id, url: `${styleguide.url}/#${rule.id}` } });

		const search = await client.callTool({ name: "search_rules", arguments: { query: "boolean flags" } });
		expect(search.structuredContent).toMatchObject({ kind: "search", matches: expect.arrayContaining([expect.objectContaining({ id: "no-flag-arguments" })]) });

		const missing = await client.callTool({ name: "get_rule", arguments: { id: "not-a-rule" } });
		expect(missing.isError).toBe(true);
		expect(missing.content[0]).toMatchObject({ type: "text", text: expect.stringContaining("Unknown rule") });
	});

	test("finds rule links for composer mentions", async () => {
		const result = await client.callTool({ name: "search_mentions", arguments: { query: "boolean flags" } });
		expect(result.structuredContent).toMatchObject({
			items: expect.arrayContaining([expect.objectContaining({ type: "resource_link", uri: `${styleguide.url}/#no-flag-arguments` })]),
		});
	});
});
