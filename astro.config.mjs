import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const captures = JSON.parse(readFileSync(new URL("./content/mirrors/captures.json", import.meta.url), "utf8"));
const aliasPaths = new Set(captures.flatMap((capture) => capture.aliases.map((alias) => `/${alias}`)));

// Cloudflare answers any asset path that contains "@" with a 307 to the percent-encoded path before it serves the file.
// Astro names a page's stylesheet after the page and writes the dot as "@_@". Rename only those assets.
const assetFileNames = (asset) => {
	const name = (asset.names?.[0] ?? asset.name ?? "asset").replace(/\.[^.]+$/, "");
	if (!name.includes("@")) return "_astro/[name].[hash][extname]";
	return `_astro/${name.replace(/@_@/g, "-").replace(/[^\w.-]/g, "-")}.[hash][extname]`;
};

export default defineConfig({
	site: "https://styleguide.fyi",
	output: "static",
	integrations: [
		sitemap({
			// Index canonical reading pages, not aliases, duplicate downloads or private actions.
			filter: (page) => {
				const path = new URL(page).pathname.replace(/\/$/, "") || "/";
				return !["/404", "/newsletter/unsubscribe"].includes(path) && !aliasPaths.has(path);
			},
			serialize: (item) => ({ ...item, url: item.url.replace(/\/$/, "") === "https://styleguide.fyi" ? "https://styleguide.fyi/" : item.url.replace(/\/$/, "") }),
		}),
	],
	vite: {
		resolve: {
			alias: { "node:zlib": fileURLToPath(new URL("./src/lib/browser-compression.ts", import.meta.url)) },
		},
		build: { rollupOptions: { output: { assetFileNames } } },
		environments: { client: { build: { rollupOptions: { output: { assetFileNames } } } } },
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: "IBM Plex Sans",
			cssVariable: "--font-sans",
			weights: [400, 500, 600],
			fallbacks: ["system-ui", "sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "IBM Plex Mono",
			cssVariable: "--font-mono",
			weights: [400, 500, 600],
			fallbacks: ["ui-monospace", "monospace"],
		},
	],
	devToolbar: { enabled: false },
});
