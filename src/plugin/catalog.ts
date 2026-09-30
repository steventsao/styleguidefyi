import { styleguide, type Rule, type Section } from "../data/styleguide";
import { countRules, ruleToMarkdown, ruleUrl, searchRules, sectionToMarkdown } from "../lib/styleguide";
import { AGREEMENT_LABELS, reviewStatus, REVIEWERS } from "../lib/consensus";

export const PLUGIN_GUIDE_URI = "ui://styleguide.fyi/guide";
export const MAX_SEARCH_RESULTS = 10;

export function guideOverview() {
	return {
		kind: "overview" as const,
		title: styleguide.title,
		updated: styleguide.updated,
		url: styleguide.url,
		ruleCount: countRules(styleguide),
		sections: styleguide.sections.map((section) => ({
			id: section.id,
			title: section.title,
			summary: section.summary,
			rules: section.rules.map((rule) => ({ id: rule.id, title: rule.title, url: ruleUrl(styleguide, rule) })),
		})),
	};
}

export function ruleDetail(id: string) {
	for (const section of styleguide.sections) {
		const rule = section.rules.find((candidate) => candidate.id === id);
		if (rule) return { kind: "rule" as const, rule: serializeRule(rule, section) };
	}
	return null;
}

function serializeRule(rule: Rule, section: Section) {
	return {
		id: rule.id,
		title: rule.title,
		section: { id: section.id, title: section.title },
		why: rule.why,
		avoid: rule.avoid ?? null,
		prefer: rule.prefer ?? null,
		lang: rule.lang ?? "ts",
		references: rule.references ?? [],
		url: ruleUrl(styleguide, rule),
		markdown: ruleToMarkdown(rule),
		reviews: REVIEWERS.map(({ id, name }) => {
			const review = rule.reviews?.[id];
			return {
				name,
				status: reviewStatus(rule, review),
				label: review ? AGREEMENT_LABELS[review.rating] : "Not rated",
				rationale: review?.rationale ?? null,
			};
		}),
	};
}

export function sectionDetail(id: string) {
	const section = styleguide.sections.find((candidate) => candidate.id === id);
	if (!section) return null;
	return {
		kind: "section" as const,
		section: {
			id: section.id,
			title: section.title,
			summary: section.summary,
			markdown: sectionToMarkdown(section),
			rules: section.rules.map((rule) => serializeRule(rule, section)),
		},
	};
}

export function searchGuideRules(query: string) {
	const normalized = query.trim().slice(0, 120);
	const matches = searchRules(styleguide, normalized).slice(0, MAX_SEARCH_RESULTS);
	return {
		kind: "search" as const,
		query: normalized,
		matches: matches.map((match) => ({
			id: match.id,
			title: match.title,
			section: match.section,
			why: match.why,
			url: match.url,
		})),
	};
}

export function mentionRules(query: string) {
	const matches = query.trim()
		? searchGuideRules(query).matches
		: styleguide.sections.flatMap((section) => section.rules.map((rule) => ({
			id: rule.id,
			title: rule.title,
			section: section.id,
			why: rule.why,
			url: ruleUrl(styleguide, rule),
		}))).slice(0, MAX_SEARCH_RESULTS);
	return matches.map((match) => ({
		type: "resource_link" as const,
		uri: match.url,
		name: match.title,
		title: match.title,
		description: `${match.section}: ${match.why}`.slice(0, 180),
	}));
}
