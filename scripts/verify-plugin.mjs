import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.argv[2] ?? "http://localhost:8791/mcp");
const client = new Client({ name: "styleguide-plugin-verifier", version: "1.0.0" });

try {
	await client.connect(new StreamableHTTPClientTransport(endpoint));
	const tools = await client.listTools();
	for (const name of ["browse_guide", "get_rule", "get_section", "search_rules", "get_styleguide", "search_mentions"]) {
		assert(tools.tools.some((tool) => tool.name === name), `Missing MCP tool: ${name}`);
	}

	const overview = await client.callTool({ name: "browse_guide", arguments: {} });
	assert.equal(overview.isError, undefined);
	assert.equal(overview.structuredContent?.kind, "overview");
	assert(overview.structuredContent?.ruleCount > 0);

	const rule = await client.callTool({ name: "get_rule", arguments: { id: "match-the-codebase" } });
	assert.equal(rule.structuredContent?.rule?.id, "match-the-codebase");
	const search = await client.callTool({ name: "search_rules", arguments: { query: "boolean flags" } });
	assert(search.structuredContent?.matches?.some((match) => match.id === "no-flag-arguments"));
	const mentions = await client.callTool({ name: "search_mentions", arguments: { query: "boolean flags" } });
	assert(mentions.structuredContent?.items?.some((item) => item.uri?.endsWith("#no-flag-arguments")));

	const resource = await client.readResource({ uri: "ui://styleguide.fyi/guide" });
	assert.equal(resource.contents[0]?.mimeType, "text/html;profile=mcp-app");
	assert(resource.contents[0]?.text?.includes('<div id="app"></div>'));
	console.log(`Verified six tools and the MCP App resource at ${endpoint}`);
} finally {
	await client.close();
}
