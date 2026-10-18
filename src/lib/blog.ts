import { getCollection, type CollectionEntry } from "astro:content";

export const blogPath = (post: CollectionEntry<"blog">) => `/blog/${post.id}`;
export const readingMinutes = (body = "") => Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 220));
export const formatDate = (date: Date) => new Intl.DateTimeFormat("en-US", {
	month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
}).format(date);

export async function publishedPosts() {
	const now = new Date();
	return (await getCollection("blog", ({ data }) => !data.draft && data.published <= now))
		.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf() || a.id.localeCompare(b.id));
}

export function escapeXml(value: string): string {
	return value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
}
