import type { APIRoute } from "astro";
import { styleguide } from "../data/styleguide";
import { countRules } from "../lib/styleguide";
import { designSystems } from "../data/design-systems";
import { compactMarkdown, topicPath } from "../lib/rule-pages";

/**
 * The llms.txt entry point: one file that tells an agent what this site holds and
 * which URL to fetch for each part. Generated, so the counts cannot go stale.
 */
function llmsTxt(): string {
	const sections = styleguide.sections.map(
		(section) => `- [${section.title}](${styleguide.url}${topicPath(section)}.md): ${section.rules.length} rules, with reasons and examples`
	);
	return [
		`# ${styleguide.title}`,
		`> ${countRules(styleguide)} coding rules with TypeScript examples, updated ${styleguide.updated}. Each rule states what to do and why, and most show an example to avoid next to one to prefer.`,
		"## Read the guide",
		[
			`- [styleguide.md](${styleguide.url}/styleguide.md): the whole guide as one markdown file. Append it to the instructions your agent already reads.`,
			`- [styleguide.compact.md](${styleguide.url}/styleguide.compact.md): every rule as one line, ${compactMarkdown(styleguide).trimEnd().split("\n").length} lines. Sized for an instruction file that is loaded every session.`,
			`- [Rules for coding agents](${styleguide.url}/agents): how to add the rules to AGENTS.md, CLAUDE.md, Cursor rules or Copilot instructions.`,
			`- One rule: ${styleguide.url}/rules/<rule-id>.md. Rule ids are listed in each section file and at ${styleguide.url}/rules.`,
			`- [consensus.json](${styleguide.url}/consensus.json): each reviewer's rating and rationale per rule.`,
			`- [The page](${styleguide.url}/): the guide in HTML. It registers read-only WebMCP tools, so a browser agent can list sections, read one, search rules, or run \`ls\`, \`cat\` and \`grep\` over a virtual copy of the guide.`,
		].join("\n"),
		"## Sections",
		sections.join("\n"),
		"## Visual design system references",
		`- [Design system collection](${styleguide.url}/design-systems): ${designSystems.length} independent visual references with official sources, stated themes, and original interactive specimens.`,
		...designSystems.map((system) => `- [${system.company}: ${system.name}](${styleguide.url}/design-systems/${system.slug}.md): selected colors, typography, spacing, and source links; checked ${system.checked}. JSON is available at ${styleguide.url}/design-systems/${system.slug}.json.`),
		"## Articles",
		`- [Blog](${styleguide.url}/blog): original articles explaining coding practices, with links to related rules.\n- [RSS feed](${styleguide.url}/rss.xml): published blog articles.\n- [About](${styleguide.url}/about): editorial context and corrections.`,
	].join("\n\n") + "\n";
}

export const GET: APIRoute = () =>
	new Response(llmsTxt(), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
