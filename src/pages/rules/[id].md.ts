import type { APIRoute } from "astro";
import { styleguide } from "../../data/styleguide";
import { ruleEntries, rulePageMarkdown, type RuleEntry } from "../../lib/rule-pages";

export function getStaticPaths() {
	return ruleEntries(styleguide).map((entry) => ({ params: { id: entry.rule.id }, props: { entry } }));
}

export const GET: APIRoute = ({ props }) =>
	new Response(rulePageMarkdown(styleguide, props.entry as RuleEntry), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
