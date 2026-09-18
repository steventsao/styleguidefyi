import { describe, expect, test, vi } from "vitest";
import { styleguide } from "../data/styleguide";
import { countRules, ruleToMarkdown, searchRules, styleguideToMarkdown } from "./styleguide";
import { createTools, type PageActions } from "./webmcp-tools";

function setup() {
	const page: PageActions = { revealSection: vi.fn(), filterRules: vi.fn() };
	const tools = createTools(styleguide, page);
	const run = (name: string, input: Record<string, unknown> = {}) =>
		tools.find((tool) => tool.name === name)!.execute(input);
	return { page, tools, run };
}

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

	test("every source has a title, an author or publisher, and an https URL", () => {
		const references = styleguide.sections.flatMap((section) => section.rules.flatMap((rule) => rule.references ?? []));

		expect(references.length).toBeGreaterThan(0);
		for (const reference of references) {
			expect(reference.title).not.toBe("");
			expect(reference.by).not.toBe("");
			expect(reference.url).toMatch(/^https:\/\/[^\s]+$/);
		}
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

	test("lists the sources of a rule that cites them", () => {
		const rule = styleguide.sections.flatMap((section) => section.rules).find((candidate) => candidate.references)!;
		const [reference] = rule.references!;

		expect(ruleToMarkdown(rule)).toContain(`Sources:\n\n- [${reference.title}](${reference.url}) (${reference.by})`);
	});
});

describe("WebMCP tools", () => {
	test("tool names are valid WebMCP names and every tool is read-only", () => {
		const { tools } = setup();

		for (const tool of tools) {
			expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
			expect(tool.description).not.toBe("");
			expect(tool.annotations.readOnlyHint).toBe(true);
		}
	});

	test("every result survives JSON serialization, as WebMCP requires", async () => {
		const { run } = setup();
		const results = [
			await run("list-sections"),
			await run("get-section", { section: "errors" }),
			await run("search-rules", { query: "tests" }),
			await run("get-styleguide"),
		];

		for (const result of results) expect(JSON.parse(JSON.stringify(result))).toEqual(result);
	});

	test("list-sections reports every rule", async () => {
		const { run } = setup();
		const result = (await run("list-sections")) as { sections: Array<{ rules: string[] }> };

		expect(result.sections.flatMap((section) => section.rules)).toHaveLength(countRules(styleguide));
	});

	test("get-section returns the section as markdown and scrolls the page to it", async () => {
		const { run, page } = setup();
		const result = await run("get-section", { section: "errors" });

		expect(result).toContain("## Errors");
		expect(result).toContain("### Never swallow an error.");
		expect(page.revealSection).toHaveBeenCalledWith("errors");
	});

	test("get-section answers an unknown id with the valid ids, so the agent can retry", async () => {
		const { run, page } = setup();
		const result = await run("get-section", { section: "nope" });

		expect(result).toMatchObject({ error: 'Unknown section "nope".' });
		expect((result as { validSections: string[] }).validSections).toContain("errors");
		expect(page.revealSection).not.toHaveBeenCalled();
	});

	test("search-rules returns the matching rules with markdown and filters the page", async () => {
		const { run, page } = setup();
		const result = (await run("search-rules", { query: "swallow" })) as {
			totalMatches: number;
			rules: Array<{ id: string; url: string; markdown: string }>;
		};

		expect(result.rules[0]).toMatchObject({
			id: "never-swallow",
			url: "https://styleguide.fyi/#never-swallow",
		});
		expect(result.rules[0].markdown).toContain("Avoid:");
		expect(page.filterRules).toHaveBeenCalledWith("swallow");
	});

	test("search-rules rejects a missing query with a correctable error", async () => {
		const { run, page } = setup();

		expect(await run("search-rules", {})).toHaveProperty("error");
		expect(page.filterRules).not.toHaveBeenCalled();
	});

	test("get-styleguide returns the same document as /styleguide.md", async () => {
		const { run } = setup();

		expect(await run("get-styleguide")).toBe(styleguideToMarkdown(styleguide));
	});
});
