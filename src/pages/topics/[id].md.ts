import type { APIRoute } from "astro";
import { styleguide, type Section } from "../../data/styleguide";
import { topicPageMarkdown } from "../../lib/rule-pages";

export function getStaticPaths() {
	return styleguide.sections.map((section) => ({ params: { id: section.id }, props: { section } }));
}

export const GET: APIRoute = ({ props }) =>
	new Response(topicPageMarkdown(styleguide, props.section as Section), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
