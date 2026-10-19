// Render deterministic social cards from the same sourced values as the pages.
// Node 24: node scripts/og/design-systems.mjs
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { designSystems } from "../../src/data/design-systems.ts";
const sharp = createRequire(import.meta.resolve("astro"))("sharp");
const out = new URL("../../public/og/", import.meta.url);
await mkdir(out, { recursive: true });
const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const text = (s, x, y, size=24, color="#1c1b19", weight=400) => `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`;
function frame(content) { return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#fbfaf7"/>${text("styleguide.fyi",56,58,22,"#c2410c",600)}${text("THE VISUAL REFERENCE COLLECTION",682,58,16,"#55524c")}<path d="M56 86H1144" stroke="#e4e0d8"/>${content}<path d="M56 560H1144" stroke="#e4e0d8"/>${text("Colors / Typography / Spacing",56,599,18,"#55524c")}${text("Official sources. Original specimens.",792,599,17,"#55524c")}</svg>`; }
async function render(name, content) { await sharp(Buffer.from(frame(content))).png().toFile(new URL(`${name}.png`,out).pathname); console.log(`Rendered ${name}.png`); }
for (const system of designSystems) {
	const headline = system.name.replace(" Design System", "");
	const palette = system.colors.slice(0,6).map((color,i)=>`<rect x="${56+i*181}" y="350" width="170" height="136" fill="${color.value}" stroke="#e4e0d8"/>${text(color.value,56+i*181,516,17,"#55524c")}`).join("");
	await render(system.slug, `${text(system.company.toUpperCase()+" / DESIGN SYSTEM",56,146,18,"#c2410c")}${text(headline,52,243,80,"#1c1b19",600)}${text(system.theme,56,294,22,"#55524c")}${palette}`);
}
const names=designSystems.map((system,i)=>`<rect x="${56+i*276}" y="347" width="258" height="154" fill="#fff" stroke="#e4e0d8"/>${text(system.company,76+i*276,385,20,"#1c1b19",600)}${system.colors.slice(2,6).map((color,j)=>`<rect x="${76+i*276+j*56}" y="410" width="50" height="65" fill="${color.value}"/>`).join("")}`).join("");
await render("design-systems",`${text("Design systems,",52,190,76,"#1c1b19",600)}${text("made visible.",52,271,76,"#1c1b19",600)}${names}`);
