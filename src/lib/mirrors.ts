import { createHash } from "node:crypto";
import { load } from "cheerio";
import { marked } from "marked";
import Slugger from "github-slugger";
import sanitizeHtml from "sanitize-html";
import captured from "../../content/mirrors/captures.json";
import sources from "../../content/mirrors/sources.json";

export interface Capture {
	id: string;
	repository: string;
	collectionTitle: string;
	route: string;
	aliases: string[];
	title: string;
	author: string;
	catalogId: string | null;
	format: "html" | "markdown";
	selector: string | null;
	upstreamUrl: string;
	sourcePath: string;
	sourceUrl: string;
	revision: string | null;
	capturedAt: string;
	sourceHash: string;
	license: { label: string; url: string; sourceUrl: string; id: string; sha256: string };
}

export const captures = captured as Capture[];
export const referenceOnly = sources.referenceOnly;
export const collections = sources.collections.map((collection) => ({
	id: collection.id,
	title: collection.title,
	documents: captures.filter((capture) => capture.repository === collection.id),
}));
export const mirrorChanges = "Saved article text, rendered in the styleguide.fyi layout. Source navigation, scripts, styles and forms are removed; images link to the original assets. Heading anchors and links are adjusted for this mirror. Google's good and bad example colors are represented by explicit text labels. The source download preserves the captured text before those display changes. This is an independent snapshot, not an official or automatically updated publication.";

// Build-time imports survive Astro relocating modules during static prerendering.
const snapshotFiles = import.meta.glob<string>("../../content/mirrors/snapshots/*/*.txt", { query: "?raw", import: "default", eager: true });

export function readSnapshot(id: string, sha256: string): string {
	if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Invalid snapshot identity");
	const source = snapshotFiles[`../../content/mirrors/snapshots/${id}/${sha256}.txt`];
	if (typeof source !== "string") throw new Error(`Missing snapshot: ${id}`);
	if (createHash("sha256").update(source).digest("hex") !== sha256) throw new Error(`Snapshot checksum mismatch: ${id}`);
	return source;
}

export function capturePaths() {
	return captures.flatMap((capture) => [capture.route, ...capture.aliases].map((mirror) => ({ params: { mirror }, props: { capture } })));
}

export function captureMetadata(capture: Capture) {
	return {
		...capture,
		mirrorUrl: `https://styleguide.fyi/${capture.route}`,
		sourceDownload: `https://styleguide.fyi/${capture.route}.source.txt`,
		licenseDownload: `https://styleguide.fyi/licenses/mirrors/${capture.license.id}.txt`,
		changes: mirrorChanges,
	};
}

function absoluteLink(href: string, capture: Capture): URL | null {
	try {
		const base = capture.format === "markdown" && !href.startsWith("/")
			? `https://github.com/${capture.repository}/blob/${capture.revision}/${capture.sourcePath}`
			: capture.upstreamUrl;
		const url = new URL(href, base);
		return ["https:", "http:", "mailto:"].includes(url.protocol) && !url.username && !url.password ? url : null;
	} catch { return null; }
}

/** Upstream documents are data. Only inert, sanitized article markup reaches the page. */
export function renderMirror(source: string, capture: Capture, available: Capture[] = captures) {
	const html = capture.format === "markdown"
		? marked.parse(source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""), { async: false })
		: source;
	const $ = load(html);
	const article = capture.selector ? $(capture.selector) : $("body");
	if (article.length !== 1) throw new Error(`Article selector no longer resolves: ${capture.id}`);
	article.find("script, style, iframe, object, embed, form, input, button, link, meta, nav, base, template").remove();
	// Google's colors carry normative meaning; preserve that distinction as visible text.
	if (capture.repository === "google/styleguide") {
		article.find("pre").each((_, element) => {
			const block = $(element);
			const code = block.find("code");
			const label = code.hasClass("bad") ? "Avoid this example" : code.hasClass("good") ? "Recommended example" : null;
			if (label) {
				const figure = $("<figure></figure>");
				block.before(figure);
				figure.append($("<figcaption></figcaption>").text(label), block);
			}
		});
	}
	const ids = new Set<string>();
	const anchors = new Map<string, string>();
	const slugger = new Slugger();
	article.find("[id], a[name]").each((_, element) => {
		const node = $(element);
		const original = node.attr("id") || node.attr("name")!;
		let id = `mirror-${original}`;
		while (ids.has(id)) id += "-duplicate";
		ids.add(id);
		if (!anchors.has(original)) anchors.set(original, id);
		node.attr("id", id).removeAttr("name");
	});
	const headings: { id: string; title: string; depth: number }[] = [];
	article.find("h1, h2, h3, h4, h5, h6").each((_, element) => {
		const heading = $(element);
		const title = heading.text().trim();
		if (!heading.attr("id")) {
			let slug = slugger.slug(title);
			while (ids.has(`mirror-${slug}`)) slug = slugger.slug(title);
			ids.add(`mirror-${slug}`);
			anchors.set(slug, `mirror-${slug}`);
			heading.attr("id", `mirror-${slug}`);
		}
		const depth = Number(element.tagName.slice(1));
		if (depth <= 3 && title && title !== capture.title) headings.push({ id: heading.attr("id")!, title, depth });
	});

	article.find("img").each((_, element) => {
		const node = $(element);
		const url = absoluteLink(node.attr("src") ?? "", capture);
		const label = `Image: ${node.attr("alt") || "view original asset"}`;
		node.replaceWith(url ? $("<a></a>").attr("href", url.href).text(label) : $("<span></span>").text(label));
	});
	article.find("a[href]").each((_, element) => {
		const node = $(element);
		const href = node.attr("href")!;
		if (href.startsWith("#")) {
			let fragment = href.slice(1);
			try { fragment = decodeURIComponent(fragment); } catch { /* Preserve an invalid upstream fragment as an external link. */ }
			const id = anchors.get(fragment);
			node.attr("href", id ? `#${id}` : new URL(href, capture.upstreamUrl).href);
			return;
		}
		const url = absoluteLink(href, capture);
		if (!url) { node.removeAttr("href"); return; }
		const hash = url.hash;
		url.hash = "";
		const target = available.find((entry) => entry.upstreamUrl.replace(/#.*$/, "") === url.href
			|| `https://github.com/${entry.repository}/blob/${entry.revision}/${entry.sourcePath}` === url.href);
		node.attr("href", target ? `/${target.route}${hash ? `#mirror-${hash.slice(1)}` : ""}` : `${url.href}${hash}`);
	});
	const safeHtml = sanitizeHtml(article.html() ?? "", {
		allowedTags: ["a", "p", "div", "span", "section", "article", "aside", "header", "footer", "figure", "figcaption", "cite", "abbr", "kbd", "samp", "var", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code", "strong", "em", "b", "i", "s", "del", "blockquote", "ul", "ol", "li", "dl", "dt", "dd", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "br", "hr", "sup", "sub", "details", "summary"],
		allowedAttributes: { "*": ["id"], a: ["href", "title"], ol: ["start"], li: ["value"], th: ["colspan", "rowspan", "scope"], td: ["colspan", "rowspan"], code: ["class"], pre: ["class"] },
		allowedSchemes: ["http", "https", "mailto"],
		allowProtocolRelative: false,
		transformTags: { h1: "h2" },
	});
	return { html: safeHtml, headings };
}
