import type { Rule, Section, Styleguide } from "../data/styleguide";

export interface RuleMatch {
	id: string;
	section: string;
	title: string;
	why: string;
	url: string;
}

const DEFAULT_LANG = "ts";

function codeBlock(label: string, code: string, lang: string): string {
	return `${label}:\n\n\`\`\`${lang}\n${code}\n\`\`\``;
}

export function ruleToMarkdown(rule: Rule): string {
	const lang = rule.lang ?? DEFAULT_LANG;
	const parts = [`### ${rule.title}`, rule.why];
	if (rule.avoid) parts.push(codeBlock("Avoid", rule.avoid, lang));
	if (rule.prefer) parts.push(codeBlock("Prefer", rule.prefer, lang));
	return parts.join("\n\n");
}

export function sectionToMarkdown(section: Section): string {
	return [
		`## ${section.title}`,
		...(section.summary ? [`_${section.summary}_`] : []),
		...section.rules.map(ruleToMarkdown),
	].join("\n\n");
}

export function styleguideToMarkdown(guide: Styleguide): string {
	return (
		[
			`# ${guide.title}`,
			...(guide.intro ? [guide.intro] : []),
			`Source: ${guide.url} (updated ${guide.updated})`,
			...guide.sections.map(sectionToMarkdown),
		].join("\n\n") + "\n"
	);
}

export function ruleUrl(guide: Styleguide, rule: Rule): string {
	return `${guide.url}/#${rule.id}`;
}

export function countRules(guide: Styleguide): number {
	return guide.sections.reduce((total, section) => total + section.rules.length, 0);
}

/**
 * Returns the rules that contain every word of `query`, best match first.
 * A word in the title or id outranks a word in the rationale or the examples.
 */
export function searchRules(guide: Styleguide, query: string): RuleMatch[] {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];

	const scored: Array<{ score: number; match: RuleMatch }> = [];
	for (const section of guide.sections) {
		for (const rule of section.rules) {
			const heading = `${rule.id} ${rule.title} ${section.title}`.toLowerCase();
			const body = `${rule.why} ${rule.avoid ?? ""} ${rule.prefer ?? ""}`.toLowerCase();

			let score = 0;
			const matchesEveryWord = words.every((word) => {
				if (heading.includes(word)) {
					score += 2;
					return true;
				}
				if (body.includes(word)) {
					score += 1;
					return true;
				}
				return false;
			});
			if (!matchesEveryWord) continue;

			scored.push({
				score,
				match: {
					id: rule.id,
					section: section.id,
					title: rule.title,
					why: rule.why,
					url: ruleUrl(guide, rule),
				},
			});
		}
	}

	return scored.toSorted((a, b) => b.score - a.score).map(({ match }) => match);
}
