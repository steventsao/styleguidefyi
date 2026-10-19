import type { APIRoute } from "astro";
import { designSystems, type DesignSystem } from "../../data/design-systems";
import { designSystemMarkdown } from "../../lib/design-systems";
export function getStaticPaths() { return designSystems.map((system) => ({ params: { slug: system.slug }, props: { system } })); }
export const GET: APIRoute = ({ props }) => new Response(designSystemMarkdown(props.system as DesignSystem), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
