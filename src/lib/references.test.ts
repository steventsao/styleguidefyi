import { describe, expect, test } from "vitest";
import { referenceCatalog } from "../data/references";
import { styleguide } from "../data/styleguide";

const rules = styleguide.sections.flatMap((section) => section.rules);

describe("reference catalog provenance", () => {
	test("a project-citation claim has an actual source on a related rule", () => {
		for (const entry of referenceCatalog.entries) {
			if (entry.status !== "cited-by-project") continue;
			const cited = rules.some((rule) => entry.relatedRules.includes(rule.id)
				&& rule.references?.some((source) => source.url === entry.url));
			expect(cited, `${entry.id} claims a project citation without evidence`).toBe(true);
		}
	});

	test("catalog anchors and related rule links resolve without collisions", () => {
		const existingIds = new Set([
			"rules", "consensus", "webmcp", "references", "references-title", "apply-references",
			...styleguide.sections.map((section) => section.id),
			...rules.map((rule) => rule.id),
		]);
		const ruleIds = new Set(rules.map((rule) => rule.id));
		for (const entry of referenceCatalog.entries) {
			const anchor = `reference-${entry.id}`;
			expect(existingIds.has(anchor)).toBe(false);
			existingIds.add(anchor);
			for (const id of entry.relatedRules) expect(ruleIds.has(id), `${entry.id}: ${id}`).toBe(true);
		}
	});
});
