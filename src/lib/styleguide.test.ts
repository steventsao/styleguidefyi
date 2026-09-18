import { describe, expect, test } from "vitest";
import { styleguide } from "../data/styleguide";
import { searchRules, styleguideToMarkdown } from "./styleguide";
describe("styleguide data", () => {
	test("every section and rule id is a unique kebab-case anchor", () => {
		const ids = styleguide.sections.flatMap((section) => [section.id, ...section.rules.map((rule) => rule.id)]);

		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
	});

	test("ids do not collide with the anchors the page itself uses", () => {
		const ids = styleguide.sections.flatMap((section) => [section.id, ...section.rules.map((rule) => rule.id)]);

		for (const reserved of ["rules", "webmcp"]) expect(ids).not.toContain(reserved);
	});
});

describe("searchRules", () => {
	test("returns only rules that contain every word", () => {
		const matches = searchRules(styleguide, "boolean flags");

		expect(matches.map((match) => match.id)).toContain("no-flag-arguments");
		expect(matches.map((match) => match.id)).not.toContain("booleans-read-as-facts");
	});

	test("ranks a title match above a match in the rationale", () => {
		const [first] = searchRules(styleguide, "mutate");

		expect(first.id).toBe("no-hidden-mutation");
	});

	test("returns nothing for an empty query", () => {
		expect(searchRules(styleguide, "   ")).toEqual([]);
	});
});

describe("styleguideToMarkdown", () => {
	test("contains every rule title and the code examples", () => {
		const markdown = styleguideToMarkdown(styleguide);

		for (const section of styleguide.sections) {
			for (const rule of section.rules) expect(markdown).toContain(`### ${rule.title}`);
		}
		expect(markdown).toContain("```ts\n");
	});
});
