import type { APIRoute } from "astro";
import { styleguide } from "../data/styleguide";
import { compactMarkdown } from "../lib/rule-pages";

/** The rules as one line each, short enough to live in an instruction file that is read every session. */
export const GET: APIRoute = () =>
	new Response(compactMarkdown(styleguide), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
