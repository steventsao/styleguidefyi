import { referenceCatalog } from "../data/references";
import type { CatalogSource } from "../data/references";

function sourceLinks(sources: CatalogSource[]): string {
	return sources.map((source) => `- [${source.title}](${source.url})`).join("\n");
}

/** Research stays separate from the rule markdown that users put in AGENTS.md. */
export function referencesToMarkdown(): string {
	const catalog = referenceCatalog;
	return [
		`# ${catalog.title}`,
		`Sources checked: ${catalog.checkedAt}`,
		catalog.intro,
		catalog.selection,
		catalog.evidence,
		"## What we can verify about Codex and Fable",
		...catalog.agentUsage.map((agent) => `### ${agent.name}\n\n${agent.status}. ${agent.text}\n\n${sourceLinks(agent.sources)}`),
		"## How to use a guide with an agent",
		catalog.adoption.map((step, index) => `${index + 1}. **${step.title}.** ${step.text}`).join("\n\n"),
		`### ${catalog.conflict.title}\n\n${catalog.conflict.text}\n\n${sourceLinks(catalog.conflict.sources)}`,
		"### An example instruction block",
		"Adapt this to your project. The catalog itself does not adopt this policy.",
		`\`\`\`markdown\n${catalog.example}\n\`\`\``,
		"## Reading list",
		"Cited by this project identifies an existing source citation. Reference only marks a reading suggestion. Related rules are topical connections, not claims of influence or endorsement.",
		...catalog.entries.map((entry) => [
			`### ${entry.title}`,
			`${entry.scope} · ${entry.publisher} · ${entry.status === "cited-by-project" ? "Cited by this project" : "Reference only"}`,
			`[Original source](${entry.url})`,
			entry.summary,
			`**Use it:** ${entry.use}`,
			`**Check it:** ${entry.check}`,
			`**Limits:** ${entry.limit}`,
			sourceLinks(entry.sources),
			`Related rules: ${entry.relatedRules.map((id) => `[${id}](https://styleguide.fyi/#${id})`).join(", ")}`,
		].filter(Boolean).join("\n\n")),
	].join("\n\n") + "\n";
}
