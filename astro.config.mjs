import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
	site: "https://styleguide.fyi",
	output: "static",
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
