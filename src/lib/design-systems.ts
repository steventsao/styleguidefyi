import type { DesignSystem } from "../data/design-systems";

export const designSystemPath = (system: DesignSystem) => `/design-systems/${system.slug}`;
export const sourceFor = (system: DesignSystem, id: string) => {
	const source = system.sources.find((source) => source.id === id);
	if (!source) throw new Error(`Missing source ${id} in ${system.slug}`);
	return source;
};

export function designSystemReference(system: DesignSystem) {
	return {
		name: system.name, organization: system.company,
		url: `https://styleguide.fyi${designSystemPath(system)}`,
		officialWebsite: system.website, checked: system.checked, theme: system.theme,
		scope: "Selected documented values. Original illustrative UI; not an official component implementation or a complete token package.",
		font: { documented: system.family, specimen: system.previewFamily, note: system.fontNote },
		colors: system.colors.map((color) => ({ ...color, source: sourceFor(system, color.source).url })),
		typography: system.typography.map((type) => ({ ...type, unit: "px", source: sourceFor(system, type.source).url })),
		spacing: system.spacing.map((space) => ({ ...space, source: sourceFor(system, space.source).url })),
		spacingNote: system.spacingNote, caveat: system.caveat, sources: system.sources,
	};
}

export function designSystemMarkdown(system: DesignSystem): string {
	return [
		`# ${system.company}: ${system.name}`,
		`${system.introduction}\n\nTheme: ${system.theme}. Sources checked: ${system.checked}.`,
		`Visual reference: https://styleguide.fyi${designSystemPath(system)}\nOfficial documentation: ${system.website}`,
		"## Colors", ["| Token | Value | Role | Source |", "| --- | --- | --- | --- |",
		...system.colors.map((color) => `| \`${color.token}\` | ${color.value} | ${color.role} | [Source](${sourceFor(system, color.source).url}) |`)].join("\n"),
		"\n## Typography", system.fontNote,
		...system.typography.map((type) => `- ${type.label} (${type.token}): ${type.size}px / ${type.lineHeight}px, weight ${type.weight}${type.smallSize ? `; small screens ${type.smallSize}px / ${type.smallLineHeight}px` : ""}. [Source](${sourceFor(system, type.source).url})`),
		"\n## Spacing", system.spacingNote,
		...system.spacing.map((space) => `- ${space.token}: ${space.px}px. [Source](${sourceFor(system, space.source).url})`),
		"\n## Reading the system",
		...system.principles.map((principle) => `### ${principle.title}\n\n${principle.text} [Source](${sourceFor(system, principle.source).url})\n`),
		"## Editorial takeaway", system.takeaway, "## Scope", system.caveat,
		"Independent reference by styleguide.fyi. Not affiliated with or endorsed by the system’s owner.",
		"## Sources", ...system.sources.map((source) => `- [${source.title}](${source.url}): ${source.detail}`), "",
	].join("\n\n");
}
