import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createStyleguideServer } from "./server";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
	"Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

export default {
	async fetch(request: Request): Promise<Response> {
		const path = new URL(request.url).pathname;
		if (path === "/health") return Response.json({ status: "ok" });
		if (path !== "/mcp") return new Response("Not found", { status: 404 });
		if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

		// The guide is public and read-only. A new server per request keeps the Worker stateless.
		const server = createStyleguideServer();
		const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
		await server.connect(transport);
		const response = await transport.handleRequest(request);
		const headers = new Headers(response.headers);
		for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
		return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
	},
};
