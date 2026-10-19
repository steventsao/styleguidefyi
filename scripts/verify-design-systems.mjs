import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { load } from "cheerio";

/** Verify the deployable public contract, including source-bearing downloads. */
export async function verifyDesignSystems(get, home) {
	const root = "/design-systems";
	assert.ok(home(`a[href="${root}"]`).length, "Collection is discoverable from home");
	const collection = load(await (await get(root)).text());
	const collectionSchema = JSON.parse(collection('script[type="application/ld+json"]').html())["@graph"].find((item) => item["@type"] === "CollectionPage");
	const items = collectionSchema.mainEntity.itemListElement;
	assert.equal(items.length, 4, "Four researched design systems");
	assert.equal(collection("h1").length, 1);
	assert.equal(collection('link[rel="canonical"]').attr("href"), `https://styleguide.fyi${root}`);
	assert.equal(collection('meta[name="robots"]').length, 0);
	const localCollection = load(await readFile(new URL("../dist/design-systems/index.html", import.meta.url), "utf8"));
	assert.equal(collection("main").text(), localCollection("main").text(), "Collection matches this build");
	const sitemap = await (await get("/sitemap-0.xml")).text();
	assert.ok(sitemap.includes(`https://styleguide.fyi${root}</loc>`));
	const agentIndex = await (await get("/llms.txt")).text();
	const images = new Set([collection('meta[property="og:image"]').attr("content")]);
	for (const item of items) {
		const path = new URL(item.url).pathname;
		assert.ok(collection(`a[href="${path}"]`).length, `${path}: linked from collection`);
		const $ = load(await (await get(path)).text());
		const local = load(await readFile(new URL(`../dist${path}/index.html`, import.meta.url), "utf8"));
		assert.equal($("main").text(), local("main").text(), `${path}: content matches this build`);
		assert.equal($("h1").length, 1);
		assert.equal($('link[rel="canonical"]').attr("href"), item.url);
		assert.equal($('link[rel="alternate"][type="text/markdown"]').attr("href"), `${path}.md`);
		assert.equal($('meta[name="robots"]').length, 0);
		const graph = JSON.parse($('script[type="application/ld+json"]').html())["@graph"];
		const article = graph.find((node) => node["@type"] === "TechArticle");
		assert.equal(article.url, item.url);
		assert.ok(article.citation.length >= 4);
		assert.ok(graph.some((node) => node["@type"] === "BreadcrumbList"));
		for (const element of $('a[href^="#"]').toArray()) {
			const id = $(element).attr("href").slice(1);
			assert.ok($("[id]").toArray().some((node) => $(node).attr("id") === id), `${path}: valid anchor #${id}`);
		}
		assert.equal($("[data-copy-color]").length, 8);
		assert.equal($("[data-type-sample]").length, 3);
		assert.equal($("[data-design-demo] input[required]").length, 2);
		assert.ok(sitemap.includes(`${item.url}</loc>`));
		for (const extension of ["json", "md"]) {
			const response = await get(`${path}.${extension}`);
			assert.match(response.headers.get("content-type"), extension === "json" ? /application\/json/ : /text\/markdown/);
			assert.equal(response.headers.get("access-control-allow-origin"), "*");
			assert.match(response.headers.get("x-robots-tag"), /noindex/);
			const data = await response.text();
			assert.equal(data, await readFile(new URL(`../dist${path}.${extension}`, import.meta.url), "utf8"), `${path}.${extension}: export matches build`);
			assert.ok(!sitemap.includes(`${item.url}.${extension}</loc>`));
			assert.ok(agentIndex.includes(`${item.url}.${extension}`));
			if (extension === "json") {
				const reference = JSON.parse(data);
				assert.equal(reference.url, item.url);
				assert.equal(reference.checked, article.dateModified);
				const sourceUrls = new Set(reference.sources.map((source) => source.url));
				for (const value of [...reference.colors, ...reference.typography, ...reference.spacing]) assert.ok(sourceUrls.has(value.source), `${path}: every value has a documented source`);
				for (const color of reference.colors) {
					assert.match(color.value, /^#[\da-f]{6}([\da-f]{2})?$/i);
					assert.ok($(`[data-copy-color="${color.value}"]`).length, `${path}: swatch agrees with export`);
				}
			}
		}
		images.add($('meta[property="og:image"]').attr("content"));
	}
	assert.equal(images.size, 5, "Distinct social image per reading page");
	for (const url of images) {
		const response = await get(new URL(url).pathname);
		assert.match(response.headers.get("content-type"), /image\/png/);
		const image = Buffer.from(await response.arrayBuffer());
		assert.equal(image.readUInt32BE(16), 1200, "Social image width");
		assert.equal(image.readUInt32BE(20), 630, "Social image height");
	}
	await get("/design-systems/missing-system", 404);
	return items.length;
}
