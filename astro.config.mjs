import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

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
			// The markdown file is a page too: it is what an agent indexes and fetches.
			customPages: ["https://styleguide.fyi/styleguide.md"],
			filter: (page) => !page.endsWith("/404/"),
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
