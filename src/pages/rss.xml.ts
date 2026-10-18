import type { APIRoute } from "astro";
import { blogPath, escapeXml, publishedPosts } from "../lib/blog";

export const GET: APIRoute = async ({ site }) => {
	const posts = await publishedPosts();
	const items = posts.map((post) => {
		const link = new URL(blogPath(post), site).href;
		return `<item><title>${escapeXml(post.data.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><description>${escapeXml(post.data.description)}</description><pubDate>${post.data.published.toUTCString()}</pubDate><category>${escapeXml(post.data.category)}</category></item>`;
	});
	return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>styleguide.fyi blog</title><link>${new URL("/blog", site).href}</link><description>Practical articles on readable code, TypeScript, and code review.</description><language>en-us</language><atom:link href="${new URL("/rss.xml", site).href}" rel="self" type="application/rss+xml"/>${items.join("")}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
