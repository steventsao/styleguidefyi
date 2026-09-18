import type { Styleguide } from "../data/styleguide";
import { ruleToMarkdown, ruleUrl, sectionToMarkdown, styleguideToMarkdown } from "./styleguide";

/** Public guide content only. No repository files or host environment are mounted. */
export function guideFiles(guide: Styleguide): Record<string, string> {
	const files: Record<string, string> = {
		"/guide/README.md": `# Guide filesystem

Start in /guide. All files are read-only and generated from the published guide.
Each call starts a fresh shell at /guide. Network and external programs are unavailable.

- styleguide.md: the complete guide
- index.json: section and rule metadata, virtual paths and public URLs
- sections/<section-id>.md: one section
- rules/<rule-id>.md: one rule, its rationale and examples

Examples:
  ls sections
  cat sections/errors.md
  grep -n -i 'permission' rules/*.md
  cat sections/tests.md | head -20
  jq '.sections[].id' index.json

Use pipes, glob patterns and text commands to select the passages you need.
No command history is persisted by this page. Results are returned to the calling agent.
`,
		"/guide/styleguide.md": styleguideToMarkdown(guide),
		"/guide/index.json": JSON.stringify({
			title: guide.title,
			updated: guide.updated,
			url: guide.url,
			sections: guide.sections.map((section) => ({
				id: section.id,
				title: section.title,
				path: `/guide/sections/${section.id}.md`,
				rules: section.rules.map((rule) => ({
					id: rule.id,
					title: rule.title,
					path: `/guide/rules/${rule.id}.md`,
					url: ruleUrl(guide, rule),
				})),
			})),
		}, null, 2) + "\n",
	};

	for (const section of guide.sections) {
		files[`/guide/sections/${section.id}.md`] = sectionToMarkdown(section) + "\n";
		for (const rule of section.rules) {
			files[`/guide/rules/${rule.id}.md`] = `${ruleToMarkdown(rule)}\n\nSource: ${ruleUrl(guide, rule)}\n`;
		}
	}
	return files;
}
