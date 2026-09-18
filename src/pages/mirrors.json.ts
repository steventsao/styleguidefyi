import { captures, captureMetadata, referenceOnly } from "../lib/mirrors";

export function GET() {
	return new Response(JSON.stringify({ schemaVersion: 1, captures: captures.map(captureMetadata), referenceOnly }, null, 2) + "\n", {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
