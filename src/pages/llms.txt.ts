import type { APIRoute } from "astro";
import { styleguide } from "../data/styleguide";
import { countRules } from "../lib/styleguide";

/**
 * The llms.txt entry point: one file that tells an agent what this site holds and
 * which URL to fetch for each part. Generated, so the counts cannot go stale.
 */
function llmsTxt(): string {
	const sections = styleguide.sections.map(
		(section) => `- [${section.title}](${styleguide.url}/#${section.id}): ${section.rules.length} rules`
	);
	return [
		`# ${styleguide.title}`,
		`> ${countRules(styleguide)} coding rules with TypeScript examples, updated ${styleguide.updated}. Each rule states what to do and why, and most show an example to avoid next to one to prefer.`,
		"## Read the guide",
		[
			`- [styleguide.md](${styleguide.url}/styleguide.md): the whole guide as one markdown file. Append it to the instructions your agent already reads.`,
			`- [consensus.json](${styleguide.url}/consensus.json): each reviewer's rating and rationale per rule.`,
			`- [The page](${styleguide.url}/): the guide in HTML. It registers read-only WebMCP tools, so a browser agent can list sections, read one, search rules, or run \`ls\`, \`cat\` and \`grep\` over a virtual copy of the guide.`,
		].join("\n"),
		"## Sections",
		sections.join("\n"),
	].join("\n\n") + "\n";
}

export const GET: APIRoute = () =>
	new Response(llmsTxt(), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
