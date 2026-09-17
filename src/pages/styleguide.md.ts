import type { APIRoute } from "astro";
import { styleguide } from "../data/styleguide";
import { styleguideToMarkdown } from "../lib/styleguide";

export const GET: APIRoute = () =>
	new Response(styleguideToMarkdown(styleguide), {
		headers: { "Content-Type": "text/markdown; charset=utf-8" },
	});
