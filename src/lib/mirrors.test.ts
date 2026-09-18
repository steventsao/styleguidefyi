import { describe, expect, test } from "vitest";
import { load } from "cheerio";
import { captures, collections, readSnapshot, renderMirror, type Capture } from "./mirrors";

const example: Capture = { ...captures.find((entry) => entry.id === "google-typescript")!, selector: "article" };

describe("mirror rendering", () => {
	test("removes active content and isolates source anchors from the surrounding page", () => {
		const result = renderMirror(`<article><h2 id="rules">Exports</h2><a href="#rules">Jump</a>
<script>alert(1)</script><iframe src="https://example.com"></iframe><style>body{display:none}</style>
<form><input name="location"></form><a onclick="alert(1)" href="javascript:alert(1)">unsafe</a>
<img src="https://example.com/pixel.png" onerror="alert(1)" alt="Diagram"><a href="data:text/html,bad">data</a></article>`, example);
		const $ = load(result.html);
		expect($("script, iframe, style, form, input, img, [onclick], [onerror]").length).toBe(0);
		expect($("#rules").length).toBe(0);
		expect($("#mirror-rules").length).toBe(1);
		expect($('a[href="#mirror-rules"]').length).toBe(1);
		expect($('a[href^="javascript:"], a[href^="data:"]').length).toBe(0);
		expect($('a[href="https://example.com/pixel.png"]').text()).toBe("Image: Diagram");
	});

	test("preserves code examples and resolves a captured sibling document locally", () => {
		const rust = captures.find((entry) => entry.id === "rust-introduction")!;
		const result = renderMirror('# Example\n\n```html\n<script>alert(1)</script>\n```\n\n[Types](types.md)\n\n## Repeated\n\n## Repeated', rust);
		const $ = load(result.html);
		expect($("code").text()).toContain("<script>alert(1)</script>");
		expect($("script").length).toBe(0);
		expect($('a[href="/rust-lang/rust/style-guide/types"]').length).toBe(1);
		expect(new Set(result.headings.map((heading) => heading.id)).size).toBe(result.headings.length);
	});

	test("fails when an upstream article selector is missing", () => {
		expect(() => renderMirror("<main>Wrong source</main>", example)).toThrow("Article selector");
	});

	test("preserves Google's good and bad example meaning without upstream color styles", () => {
		const result = renderMirror('<article><pre><code class="language-ts good">const yes = 1;</code></pre><pre><code class="language-ts bad">var no = 1;</code></pre></article>', example);
		const $ = load(result.html);
		expect($("figure").map((_, node) => $(node).text()).get()).toEqual([
			"Recommended exampleconst yes = 1;", "Avoid this examplevar no = 1;",
		]);
	});
});

describe("published mirror integrity", () => {
	test("every captured source and license matches its recorded checksum", () => {
		for (const capture of captures) {
			expect(readSnapshot(capture.id, capture.sourceHash).length).toBeGreaterThan(100);
			expect(readSnapshot(capture.license.id, capture.license.sha256).length).toBeGreaterThan(40);
		}
	});

	test("rejects paths and malformed hashes before attempting to read files", () => {
		expect(() => readSnapshot("../../package", "a".repeat(64))).toThrow("Invalid snapshot identity");
		expect(() => readSnapshot("google-typescript", "../source")).toThrow("Invalid snapshot identity");
	});

	test("all reader anchors resolve and raw active elements never reach the rendered guides", () => {
		for (const capture of captures) {
			const result = renderMirror(readSnapshot(capture.id, capture.sourceHash), capture);
			const $ = load(result.html);
			const ids = new Set($("[id]").map((_, element) => $(element).attr("id")).get());
			for (const heading of result.headings) expect(ids.has(heading.id), `${capture.id}: ${heading.id}`).toBe(true);
			for (const link of $('a[href^="#"]').toArray()) expect(ids.has($(link).attr("href")!.slice(1)), `${capture.id}: ${$(link).attr("href")}`).toBe(true);
			expect($("script, style, iframe, form, img, [onload], [onclick]").length, capture.id).toBe(0);
		}
	});

	test("reader and collection routes are unique and Google TypeScript has its short alias", () => {
		const routes = captures.flatMap((entry) => [entry.route, ...entry.aliases]);
		for (const collection of collections) if (!routes.includes(collection.id)) routes.push(collection.id);
		expect(new Set(routes).size).toBe(routes.length);
		for (const route of routes) expect(route).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/);
		expect(captures.find((entry) => entry.id === "google-typescript")?.aliases).toContain("google/typescript");
	});
});
