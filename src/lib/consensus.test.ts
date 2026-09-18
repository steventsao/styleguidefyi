import { expect, test } from "vitest";
import { styleguide } from "../data/styleguide";
import { AGREEMENT_LABELS, consensusData, reviewStatus, ruleFingerprint } from "./consensus";

const rule = styleguide.sections[0].rules[0];

test("the scale has five distinct positions", () => {
	expect(Object.values(AGREEMENT_LABELS)).toEqual([
		"Strongly agree", "Somewhat agree", "Neutral", "Somewhat disagree", "Strongly disagree",
	]);
});

test("an absent review is not a neutral vote", () => {
	expect(reviewStatus(rule, null)).toBe("unrated");
	expect(reviewStatus(rule, { rating: "neutral", rationale: "Either convention is reasonable.", reviewedAt: "2026-09-17", reviewedHash: ruleFingerprint(rule) })).toBe("current");
});

test.each(["title", "why", "avoid", "prefer", "lang"] as const)("a change to %s makes an earlier review stale", (field) => {
	const review = { rating: "strongly-agree" as const, rationale: "A useful default.", reviewedAt: "2026-09-17", reviewedHash: ruleFingerprint(rule) };
	expect(reviewStatus(rule, review)).toBe("current");
	expect(reviewStatus({ ...rule, [field]: "changed wording" }, review)).toBe("outdated");
});

test("source changes invalidate a review, while another review does not", () => {
	const fingerprint = ruleFingerprint(rule);
	expect(ruleFingerprint({ ...rule, references: [{ title: "Another source", by: "Author", url: "https://example.com" }] })).not.toBe(fingerprint);
	expect(ruleFingerprint({ ...rule, reviews: {} })).toBe(fingerprint);
});

test("the public consensus includes every rule and preserves the absence of a Fable vote", () => {
	const data = consensusData(styleguide);
	expect(data.rules.map(({ id }) => id)).toEqual(styleguide.sections.flatMap(({ rules }) => rules.map(({ id }) => id)));
	const first = data.rules[0];
	expect(first.reviews.astra).toMatchObject({ rating: "strongly-agree", status: "current" });
	expect(first.reviews.fable).toBeNull();
	expect(JSON.parse(JSON.stringify(data))).toEqual(data);
});
