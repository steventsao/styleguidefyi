import { referenceCatalog } from "../data/references";

export function GET() {
	return new Response(JSON.stringify(referenceCatalog, null, 2) + "\n", {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
