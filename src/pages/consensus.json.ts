import { styleguide } from "../data/styleguide";
import { consensusData } from "../lib/consensus";

export function GET() {
	return new Response(JSON.stringify(consensusData(styleguide), null, 2) + "\n", {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
