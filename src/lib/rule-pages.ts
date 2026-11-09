import type { Rule, Section, Styleguide } from "../data/styleguide";
import { ruleToMarkdown, sectionToMarkdown } from "./styleguide";

/** A rule together with the section it belongs to and its position in the guide. */
export interface RuleEntry {
	rule: Rule;
	section: Section;
	/** "5.3": section number, then rule number. Matches the numbering on the home page. */
	number: string;
}

const DESCRIPTION_LIMIT = 158;

export const rulePath = (rule: Pick<Rule, "id">) => `/rules/${rule.id}`;
export const topicPath = (section: Pick<Section, "id">) => `/topics/${section.id}`;

export function ruleEntries(guide: Styleguide): RuleEntry[] {
	return guide.sections.flatMap((section, sectionIndex) =>
		section.rules.map((rule, ruleIndex) => ({ rule, section, number: `${sectionIndex + 1}.${ruleIndex + 1}` }))
	);
}

/** Rule text marks inline code with backticks. Metadata and headings need the words without them. */
export function plainText(text: string): string {
	return text.replace(/`([^`]+)`/g, "$1");
}

/** A rule title is a sentence. A page title reads better without its final period. */
export function titleWithoutPeriod(title: string): string {
	return plainText(title).replace(/\.$/, "");
}

/** Cuts at a sentence end when one fits, otherwise at a word, so a description never stops mid-word. */
export function metaDescription(text: string, limit = DESCRIPTION_LIMIT): string {
	const plain = plainText(text).replace(/\s+/g, " ").trim();
	if (plain.length <= limit) return plain;
	const window = plain.slice(0, limit);
	const sentenceEnd = window.lastIndexOf(". ");
	if (sentenceEnd >= limit / 2) return window.slice(0, sentenceEnd + 1);
	return `${window.slice(0, window.lastIndexOf(" "))}…`;
}

/** The rule as a file an agent or a person can save: the text, then where it came from. */
export function rulePageMarkdown(guide: Styleguide, entry: RuleEntry): string {
	return [
		ruleToMarkdown(entry.rule).replace(/^### /, "# "),
		`Part of: [${entry.section.title}](${guide.url}${topicPath(entry.section)}.md)`,
		`Source: ${guide.url}${rulePath(entry.rule)} (guide updated ${guide.updated})`,
	].join("\n\n") + "\n";
}

export function topicPageMarkdown(guide: Styleguide, section: Section): string {
	return [
		sectionToMarkdown(section).replace(/^## /, "# ").replace(/\n### /g, "\n## "),
		`Source: ${guide.url}${topicPath(section)} (guide updated ${guide.updated})`,
	].join("\n\n") + "\n";
}

/**
 * Every rule as one imperative line, grouped by section. An instruction file is read in full on
 * every session, so this version states the rules and leaves the reasons and examples at the links.
 */
export function compactMarkdown(guide: Styleguide): string {
	const sections = guide.sections.map((section) =>
		[`## ${section.title}`, section.rules.map((rule) => `- ${rule.title}`).join("\n")].join("\n\n")
	);
	return [
		"# Coding rules",
		`Each rule has a reason and an example at ${guide.url}/rules/<id>. Full text: ${guide.url}/styleguide.md (updated ${guide.updated}).`,
		...sections,
	].join("\n\n") + "\n";
}
