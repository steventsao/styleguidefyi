import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { load } from "cheerio";

const SITE = "https://styleguide.fyi";
const graph = ($) => JSON.parse($('script[type="application/ld+json"]').html())["@graph"];

/** Verify the rule, topic and agent pages: each is canonical, linked, in the sitemap and matches this build. */
export async function verifyRules(get, home) {
	assert.ok(home('a[href="/rules"]').length, "Rule index is discoverable from home");
	assert.ok(home('a[href="/agents"]').length, "Agent setup page is discoverable from home");
	const index = load(await (await get("/rules")).text());
	assert.equal(index("h1").length, 1);
	assert.equal(index('link[rel="canonical"]').attr("href"), `${SITE}/rules`);
	const items = graph(index).find((item) => item["@type"] === "CollectionPage").mainEntity.itemListElement;
	const homeRuleIds = home("[data-rule]").toArray().map((node) => home(node).attr("id"));
	assert.deepEqual(items.map((item) => new URL(item.url).pathname), homeRuleIds.map((id) => `/rules/${id}`), "Rule index lists the rules on the home page, in order");
	const sitemap = await (await get("/sitemap-0.xml")).text();
	const inSitemap = (path) => assert.ok(sitemap.includes(`<loc>${SITE}${path}</loc>`), `${path}: present in sitemap`);
	const checkPage = async (path) => {
		const $ = load(await (await get(path)).text());
		const local = load(await readFile(new URL(`../dist${path}/index.html`, import.meta.url), "utf8"));
		assert.equal($("main").text(), local("main").text(), `${path}: content matches this build`);
		assert.equal($("h1").length, 1, `${path}: one h1`);
		assert.equal($('link[rel="canonical"]').attr("href"), `${SITE}${path}`);
		assert.equal($('meta[name="robots"]').length, 0, `${path}: indexable`);
		const description = $('meta[name="description"]').attr("content");
		assert.ok(description.length >= 50 && description.length <= 180, `${path}: description length ${description.length}`);
		assert.ok(graph($).some((item) => item["@type"] === "BreadcrumbList"), `${path}: breadcrumbs`);
		inSitemap(path);
		return $;
	};
	const markdown = async (path) => {
		const response = await get(path);
		assert.match(response.headers.get("content-type"), /text\/markdown/, `${path}: served as markdown`);
		const text = await response.text();
		assert.equal(text, await readFile(new URL(`../dist${path}`, import.meta.url), "utf8"), `${path}: matches this build`);
		assert.ok(!sitemap.includes(`${SITE}${path}<`), `${path}: download kept out of the sitemap`);
		return text;
	};
	inSitemap("/rules");
	for (const item of items) {
		const path = new URL(item.url).pathname;
		const id = path.split("/").at(-1);
		assert.ok(index(`a[href="${path}"]`).length, `${path}: linked from the rule index`);
		assert.ok(home(`#${id} a[href="${path}"]`).length, `${path}: linked from its rule on the home page`);
		const $ = await checkPage(path);
		assert.equal($("h1").text(), home(`#${id} .rule-title`).text(), `${path}: same wording as the guide`);
		assert.equal($('link[rel="alternate"][type="text/markdown"]').attr("href"), `${path}.md`);
		assert.ok($(`a[href="/#${id}"]`).length, `${path}: links back to the guide`);
		assert.ok((await markdown(`${path}.md`)).includes(`Source: ${SITE}${path}`));
	}
	const topicPaths = [...new Set(index('a[href^="/topics/"]').toArray().map((node) => index(node).attr("href")))];
	assert.equal(topicPaths.length, home("[data-section]").length, "One topic page per guide section");
	let topicRules = 0;
	for (const path of topicPaths) {
		const $ = await checkPage(path);
		const ruleLinks = $(".topic-rule h2 a").toArray().map((node) => $(node).attr("href"));
		assert.ok(ruleLinks.length > 0 && ruleLinks.every((href) => items.some((item) => item.url === `${SITE}${href}`)), `${path}: links to its rule pages`);
		topicRules += ruleLinks.length;
		await markdown(`${path}.md`);
	}
	assert.equal(topicRules, items.length, "Every rule appears on exactly one topic page");
	const agents = await checkPage("/agents");
	for (const href of ["/styleguide.compact.md", "/styleguide.md", "/rules", ...topicPaths]) assert.ok(agents(`a[href="${href}"]`).length, `/agents links to ${href}`);
	const compact = await markdown("/styleguide.compact.md");
	assert.equal(compact.match(/^- /gm).length, items.length, "Compact file states every rule once");
	const agentIndex = await (await get("/llms.txt")).text();
	for (const expected of [`${SITE}/styleguide.compact.md`, `${SITE}/agents`, ...topicPaths.map((path) => `${SITE}${path}.md`)]) assert.ok(agentIndex.includes(expected), `llms.txt lists ${expected}`);
	return { rules: items.length, topics: topicPaths.length };
}
