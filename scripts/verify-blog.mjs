import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { load } from "cheerio";

export async function verifyBlog(get, home) {
	const rssResponse = await get("/rss.xml");
	assert.match(rssResponse.headers.get("content-type"), /application\/rss\+xml/);
	const rss = await rssResponse.text();
	assert.equal(rss, await readFile(new URL("../dist/rss.xml", import.meta.url), "utf8"), "RSS matches this build");
	const feed = load(rss, { xmlMode: true });
	const articleUrls = feed("item > link").toArray().map((node) => feed(node).text());
	assert.ok(articleUrls.length > 0, "Blog has published articles");
	const blog = load(await (await get("/blog")).text());
	const pages = new Map([["/", home], ["/blog", blog]]);
	assert.equal(blog("h1").length, 1);
	assert.equal(blog('link[rel="canonical"]').attr("href"), "https://styleguide.fyi/blog");
	assert.equal(blog('form[action="/api/newsletter"][method="post"]').length, 1);
	assert.equal(blog('input[name="email"][type="email"][required]').length, 1);
	assert.equal(blog('input[name="consent"][required]').length, 1);
	for (const url of articleUrls) {
		const path = new URL(url).pathname;
		assert.ok(blog(`a[href="${path}"]`).length > 0, `${path}: discoverable from the blog`);
		const $ = load(await (await get(path)).text());
		pages.set(path, $);
		assert.equal($("h1").length, 1);
		assert.equal($('link[rel="canonical"]').attr("href"), url);
		assert.equal($('meta[property="og:type"]').attr("content"), "article");
		assert.equal($('meta[name="robots"]').length, 0);
		const schema = JSON.parse($('script[type="application/ld+json"]').html());
		const article = schema["@graph"].find((item) => item["@type"] === "BlogPosting");
		assert.equal(article.headline, $("h1").text());
		assert.equal(article.description, $('meta[name="description"]').attr("content"));
		assert.equal(article.datePublished, $(".article-meta time").first().attr("datetime"));
		assert.equal(article.mainEntityOfPage, url);
		assert.equal(article.author.url, "https://styleguide.fyi/about");
		assert.ok(schema["@graph"].some((item) => item["@type"] === "BreadcrumbList"));
		assert.ok($(".article-body").text().length > 1500, "Article has substantive server-rendered content");
		const local = load(await readFile(new URL(`../dist${path}/index.html`, import.meta.url), "utf8"));
		assert.equal($(".article-body").text(), local(".article-body").text(), "Article matches this build");
	}
	// Verify in-article navigation and links to real rules, not just successful routes.
	for (const [path, $] of [...pages].filter(([path]) => path.startsWith("/blog/"))) {
		for (const node of $(".article-body a[href], aside a[href]").toArray()) {
			const href = $(node).attr("href");
			if (!href.startsWith("/") && !href.startsWith("#")) continue;
			const url = new URL(href, `https://styleguide.fyi${path}`);
			if (!pages.has(url.pathname)) pages.set(url.pathname, load(await (await get(url.pathname)).text()));
			const target = pages.get(url.pathname);
			if (url.hash) assert.ok(target("[id]").toArray().some((element) => target(element).attr("id") === decodeURIComponent(url.hash.slice(1))), `Broken article link: ${path} -> ${href}`);
		}
	}
	const index = load(await (await get("/sitemap-index.xml")).text(), { xmlMode: true });
	const sitemapUrls = [];
	for (const node of index("loc").toArray()) {
		const sitemap = load(await (await get(new URL(index(node).text()).pathname)).text(), { xmlMode: true });
		sitemapUrls.push(...sitemap("loc").toArray().map((item) => sitemap(item).text()));
	}
	for (const url of ["https://styleguide.fyi/blog", ...articleUrls]) assert.ok(sitemapUrls.includes(url), `${url}: present in sitemap`);
	for (const url of sitemapUrls) assert.ok(!/\/404\/?$|\/newsletter\/unsubscribe\/?$|\.md$|\/google\/typescript\/?$/.test(url), `${url}: noncanonical or private page in sitemap`);
	assert.match(await (await get("/robots.txt")).text(), /Sitemap: https:\/\/styleguide\.fyi\/sitemap-index\.xml/);
	const unsubscribe = load(await (await get("/newsletter/unsubscribe")).text());
	assert.match(unsubscribe('meta[name="robots"]').attr("content"), /noindex/);
	await get("/api/newsletter", 405);
	return articleUrls.length;
}
