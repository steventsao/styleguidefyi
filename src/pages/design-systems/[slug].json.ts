import type { APIRoute } from "astro";
import { designSystems, type DesignSystem } from "../../data/design-systems";
import { designSystemReference } from "../../lib/design-systems";
export function getStaticPaths() { return designSystems.map((system) => ({ params: { slug: system.slug }, props: { system } })); }
export const GET: APIRoute = ({ props }) => new Response(JSON.stringify(designSystemReference(props.system as DesignSystem), null, 2) + "\n", { headers: { "Content-Type": "application/json; charset=utf-8" } });
