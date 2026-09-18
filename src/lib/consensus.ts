import type { AgreementRating, Reviewer, Rule, RuleReview, Styleguide } from "../data/styleguide";

export const AGREEMENT_LABELS: Record<AgreementRating, string> = {
	"strongly-agree": "Strongly agree",
	"somewhat-agree": "Somewhat agree",
	neutral: "Neutral",
	"somewhat-disagree": "Somewhat disagree",
	"strongly-disagree": "Strongly disagree",
};

export const REVIEWERS: ReadonlyArray<{ id: Reviewer; name: string }> = [
	{ id: "astra", name: "Astra" },
	{ id: "fable", name: "Fable" },
];

/** FNV-1a detects wording changes; it is not an identity or security check. */
export function ruleFingerprint(rule: Rule): string {
	const content = JSON.stringify([rule.id, rule.title, rule.why, rule.avoid ?? null, rule.prefer ?? null, rule.lang ?? "ts", rule.references ?? []]);
	let hash = 2166136261;
	for (let i = 0; i < content.length; i++) hash = Math.imul(hash ^ content.charCodeAt(i), 16777619);
	return (hash >>> 0).toString(16).padStart(8, "0");
}

export function reviewStatus(rule: Rule, review: RuleReview | null | undefined): "unrated" | "current" | "outdated" {
	if (!review) return "unrated";
	return review.reviewedHash === ruleFingerprint(rule) ? "current" : "outdated";
}

export function consensusData(guide: Styleguide) {
	return {
		scale: AGREEMENT_LABELS,
		reviewers: REVIEWERS,
		rules: guide.sections.flatMap((section) => section.rules.map((rule) => ({
			id: rule.id,
			title: rule.title,
			section: section.id,
			url: `${guide.url}/#${rule.id}`,
			reviews: Object.fromEntries(REVIEWERS.map(({ id }) => {
				const review = rule.reviews?.[id];
				return [id, review ? { ...review, status: reviewStatus(rule, review) } : null];
			})),
		}))),
	};
}
