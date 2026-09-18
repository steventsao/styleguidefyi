import { referencesToMarkdown } from "../lib/references";

export function GET() {
	return new Response(referencesToMarkdown(), {
		headers: { "Content-Type": "text/markdown; charset=utf-8" },
	});
}
