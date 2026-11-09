import { describe, expect, test } from "vitest";
import { styleguide } from "../data/styleguide";
import { topics } from "../data/topics";
import { countRules } from "./styleguide";
import { compactMarkdown, metaDescription, plainText, ruleEntries, rulePageMarkdown, rulePath, titleWithoutPeriod, topicPageMarkdown, topicPath } from "./rule-pages";

describe("rule pages", () => {
	const entries = ruleEntries(styleguide);

	test("every rule has one entry, numbered by section and position", () => {
		expect(entries).toHaveLength(countRules(styleguide));
		expect(entries[0].number).toBe("1.1");
		const lastSection = styleguide.sections.at(-1)!;
		expect(entries.at(-1)!.number).toBe(`${styleguide.sections.length}.${lastSection.rules.length}`);
	});

	test("paths are built from the public ids", () => {
		expect(rulePath({ id: "no-any" })).toBe("/rules/no-any");
		expect(topicPath({ id: "types-and-data" })).toBe("/topics/types-and-data");
	});

	test("every section has topic copy, and no copy is left for a section that does not exist", () => {
		expect(Object.keys(topics).sort()).toEqual(styleguide.sections.map((section) => section.id).sort());
		for (const topic of Object.values(topics)) {
			expect(topic.heading.length).toBeLessThanOrEqual(60);
			expect(topic.intro.length).toBeGreaterThan(80);
		}
	});

	test("metadata text drops the backticks that mark inline code", () => {
		expect(plainText("Do not use `any`; use `unknown` and narrow.")).toBe("Do not use any; use unknown and narrow.");
		expect(titleWithoutPeriod("Name your constants.")).toBe("Name your constants");
	});

	test("a description fits a search result and never ends mid-word", () => {
		for (const { rule } of entries) {
			const description = metaDescription(rule.why);
			expect(description.length).toBeGreaterThan(40);
			expect(description.length).toBeLessThanOrEqual(160);
			expect(description).toMatch(/[.…”"?!)]$/);
			expect(description).not.toContain("`");
		}
		expect(metaDescription("Short text.")).toBe("Short text.");
	});

	test("a rule's markdown carries the rule, its topic and its source", () => {
		const entry = entries.find(({ rule }) => rule.id === "parse-at-the-boundary")!;
		const markdown = rulePageMarkdown(styleguide, entry);

		expect(markdown.startsWith("# Parse at the boundary; trust your types inside.\n")).toBe(true);
		expect(markdown).toContain("Avoid:\n\n```ts");
		expect(markdown).toContain("https://styleguide.fyi/topics/types-and-data.md");
		expect(markdown).toContain("Source: https://styleguide.fyi/rules/parse-at-the-boundary");
	});

	test("a topic's markdown holds every rule of the section under one top heading", () => {
		const section = styleguide.sections.find((candidate) => candidate.id === "errors")!;
		const markdown = topicPageMarkdown(styleguide, section);

		expect(markdown.match(/^# /gm)).toHaveLength(1);
		expect(markdown.match(/^## /gm)).toHaveLength(section.rules.length);
		expect(markdown).not.toMatch(/^### /m);
	});

	test("the compact version states every rule once and fits an instruction file", () => {
		const markdown = compactMarkdown(styleguide);

		for (const { rule } of entries) expect(markdown).toContain(`- ${rule.title}\n`);
		expect(markdown.match(/^- /gm)).toHaveLength(entries.length);
		expect(markdown.trimEnd().split("\n").length).toBeLessThan(200);
	});
});
