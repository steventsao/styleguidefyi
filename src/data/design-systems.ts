/** Curated observations from official documentation, checked 2026-10-19.
 * Values describe the stated theme/version, not every product using the system.
 * The visual compositions and commentary on our pages are original examples.
 */
export interface DesignSource { id: string; title: string; url: string; detail: string }
export interface DesignColor { token: string; value: string; role: string; source: string }
export interface DesignType { token: string; label: string; size: number; lineHeight: number; weight: number; source: string; smallSize?: number; smallLineHeight?: number }
export interface DesignSystem {
	slug: string; name: string; company: string; monogram: string; category: string;
	description: string; introduction: string; theme: string; checked: string; website: string;
	family: string; previewFamily: string; fontNote: string; spacingNote: string;
	colors: DesignColor[]; typography: DesignType[]; spacing: { token: string; px: number; source: string }[];
	sources: DesignSource[]; principles: { title: string; text: string; source: string }[];
	takeaway: string; caveat: string;
	preview: { action: string; ink: string; muted: string; surface: string; border: string; radius: string; button: string; title: string; eyebrow: string };
}

export const designSystems: DesignSystem[] = [
	{
		slug: "github-primer", name: "Primer", company: "GitHub", monogram: "GH", category: "Developer tools",
		description: "Explore GitHub’s Primer design system with sourced color tokens, typography, spacing, and an interactive UI specimen.",
		introduction: "Primer is GitHub’s design system for product interfaces. Its documentation separates reusable primitives from components and workflow patterns. This reference focuses on the light product UI: compact text, restrained surfaces, and explicit colors for actions and states.",
		theme: "Light · Product UI", checked: "2026-10-19", website: "https://primer.style/product/",
		family: "Mona Sans VF + system fallbacks", previewFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
		fontNote: "The documented sans-serif stack starts with Mona Sans VF. These specimens use the system fallbacks; Mona Sans is not bundled here. The sizes, weights, and line heights below are documented Primer values.",
		spacingNote: "A selection of base size primitives, shown at a 16px root size. Primer also gives spacing a purpose: stack-gap-condensed is 8px, normal is 16px, and spacious is 24px.",
		colors: [
			{ token: "--bgColor-default", value: "#ffffff", role: "Default background", source: "color" },
			{ token: "--bgColor-muted", value: "#f6f8fa", role: "Muted background", source: "color" },
			{ token: "--fgColor-default", value: "#1f2328", role: "Default text", source: "color" },
			{ token: "--fgColor-muted", value: "#59636e", role: "Secondary text", source: "color" },
			{ token: "--fgColor-accent", value: "#0969da", role: "Accent foreground", source: "color" },
			{ token: "--button-primary-bgColor-rest", value: "#1f883d", role: "Primary button background", source: "color" },
			{ token: "--fgColor-danger", value: "#d1242f", role: "Danger foreground", source: "color" },
			{ token: "--borderColor-default", value: "#d1d9e0", role: "Default border", source: "color" },
		],
		typography: [
			{ token: "--text-title-shorthand-large", label: "Title large", size: 32, lineHeight: 48, weight: 600, source: "type" },
			{ token: "--text-title-shorthand-small", label: "Title small", size: 16, lineHeight: 24, weight: 600, source: "type" },
			{ token: "--text-body-shorthand-medium", label: "Body medium", size: 14, lineHeight: 21, weight: 400, source: "type" },
		],
		spacing: [4, 8, 12, 16, 24, 32, 48].map((px) => ({ token: `--base-size-${px}`, px, source: "size" })),
		principles: [
			{ title: "Name the job of a color", text: "Foreground, background, and border tokens are separate families. An accent foreground and a primary button background have different jobs, even when both draw attention. Keep those roles separate when you build a theme.", source: "color" },
			{ title: "Give spacing a context", text: "The base sizes supply raw measurements. Stack and control tokens turn them into layout decisions. A normal stack gap communicates intent more clearly than a repeated numeric margin scattered through component styles.", source: "size" },
			{ title: "Use a compact reading hierarchy", text: "The medium body style is 14px, while a large title is 32px. Smaller type is useful in a dense interface, but the hierarchy still needs headings, labels, and enough line height to distinguish scanning from reading.", source: "type" },
		],
		takeaway: "For a developer tool, start by separating content, controls, and status. Primer is a useful reference for keeping a busy screen legible without making every panel visually loud. Adopt the naming discipline before copying individual hex values.",
		caveat: "This is a selected light-theme reference, not a snapshot of all GitHub pages. Product UI and Brand UI are separate parts of Primer. The typography shorthand tokens combine size, line height, weight, and font family into one style.",
		sources: [
			{ id: "overview", title: "Primer Product UI", url: "https://primer.style/product/", detail: "Scope, components, patterns, and primitives." },
			{ id: "color", title: "Primer color primitives", url: "https://primer.style/product/primitives/color/", detail: "Exact light-theme colors and primary button token." },
			{ id: "type", title: "Primer typography primitives", url: "https://primer.style/product/primitives/typography/", detail: "Font stack, sizes, line-height ratios, and weights. rem values converted at 16px." },
			{ id: "size", title: "Primer size primitives", url: "https://primer.style/product/primitives/size/", detail: "Base sizes, stack gaps, and corner radii." },
		],
		preview: { action: "#1f883d", ink: "#1f2328", muted: "#59636e", surface: "#f6f8fa", border: "#d1d9e0", radius: "6px", button: "Create issue", title: "A place for the next idea.", eyebrow: "PRODUCT / INTERFACE" },
	},
	{
		slug: "atlassian", name: "Atlassian Design System", company: "Atlassian", monogram: "A", category: "Team collaboration",
		description: "A visual reference to Atlassian’s design system: verified light-theme tokens, the 8px spacing unit, typography, and UI examples.",
		introduction: "Atlassian’s system organizes interface decisions into semantic tokens and shared components. Its foundations connect color, typography, and spacing across team workflows. This reference pairs the public guidance with resolved values from @atlaskit/tokens 20.6.1.",
		theme: "Light · tokens 20.6.1", checked: "2026-10-19", website: "https://atlassian.design/",
		family: "Atlassian Sans + system fallbacks", previewFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif",
		fontNote: "The package specifies Atlassian Sans. These specimens use its system fallbacks, so letterforms and the variable heading weight of 653 will differ. Typography values below come from the pinned package’s typography theme.",
		spacingNote: "The base unit is 8px: space.100. The scale includes fractional units for compact layouts. These are selected values, not the complete spacing scale.",
		colors: [
			{ token: "elevation.surface", value: "#ffffff", role: "Default surface", source: "resolved-color" },
			{ token: "elevation.surface.sunken", value: "#f8f8f8", role: "Sunken surface", source: "resolved-color" },
			{ token: "color.text", value: "#292a2e", role: "Default text", source: "resolved-color" },
			{ token: "color.text.subtle", value: "#505258", role: "Secondary text", source: "resolved-color" },
			{ token: "color.background.brand.bold", value: "#1868db", role: "Bold brand background", source: "resolved-color" },
			{ token: "color.text.success", value: "#4c6b1f", role: "Success text", source: "resolved-color" },
			{ token: "color.background.success", value: "#efffd6", role: "Success background", source: "resolved-color" },
			{ token: "color.border", value: "#0b120e24", role: "Default border · includes alpha", source: "resolved-color" },
		],
		typography: [
			{ token: "font.heading.large", label: "Heading large", size: 24, lineHeight: 28, weight: 653, source: "resolved-type" },
			{ token: "font.heading.medium", label: "Heading medium", size: 20, lineHeight: 24, weight: 653, source: "resolved-type" },
			{ token: "font.body", label: "Body default", size: 14, lineHeight: 20, weight: 400, source: "resolved-type" },
		],
		spacing: [["050",4],["100",8],["150",12],["200",16],["300",24],["400",32],["600",48]].map(([name, px]) => ({ token: `space.${name}`, px: Number(px), source: "space" })),
		principles: [
			{ title: "Resolve tokens through a theme", text: "A name such as color.background.brand.bold describes a role. The light and dark themes resolve that role to different values. The swatches here deliberately use one pinned package and one theme so they can be checked.", source: "tokens" },
			{ title: "Build rhythm from an 8px unit", text: "Atlassian’s spacing scale includes 4px, 8px, 12px, and 16px steps before larger layout gaps. Fractional units help compact controls sit comfortably beside more spacious groups without introducing a second spacing vocabulary.", source: "space" },
			{ title: "Treat type as a complete style", text: "Typography tokens set a combination of font properties. A heading is more than a size. Preserve its line height and weight, and keep the HTML heading level tied to the content structure rather than its visual appearance.", source: "type" },
		],
		takeaway: "For a collaborative workspace, semantic names are the most transferable idea. Define what a surface, selection, or success message means before choosing its appearance. This gives a future theme change a much smaller surface area.",
		caveat: "Values are pinned to @atlaskit/tokens 20.6.1. Live documentation and individual Atlassian products may move ahead independently. The component composition and its corner treatment here are illustrative, not an exact Jira or Confluence screen.",
		sources: [
			{ id: "tokens", title: "Atlassian token reference", url: "https://atlassian.design/components/tokens/all-tokens/", detail: "Semantic token names, roles, and theme mappings." },
			{ id: "resolved-color", title: "Resolved light theme · 20.6.1", url: "https://unpkg.com/@atlaskit/tokens@20.6.1/dist/cjs/artifacts/themes/atlassian-light.js", detail: "Published Atlassian package artifact; exact hex values, including alpha." },
			{ id: "resolved-type", title: "Resolved typography · 20.6.1", url: "https://unpkg.com/@atlaskit/tokens@20.6.1/dist/cjs/artifacts/themes/atlassian-typography.js", detail: "Published font shorthand values; rem values converted at 16px." },
			{ id: "space", title: "Atlassian spacing", url: "https://atlassian.design/foundations/spacing/", detail: "8px base unit and named spacing scale." },
			{ id: "type", title: "Applying Atlassian typography", url: "https://atlassian.design/foundations/typography/applying-typography", detail: "Text roles and implementation guidance." },
		],
		preview: { action: "#1868db", ink: "#292a2e", muted: "#505258", surface: "#f8f8f8", border: "#0b120e24", radius: "6px", button: "Create task", title: "Good work happens together.", eyebrow: "TEAM / WORKSPACE" },
	},
	{
		slug: "ibm-carbon", name: "Carbon", company: "IBM", monogram: "IBM", category: "Enterprise software",
		description: "Explore IBM’s Carbon design system visually: White theme colors, IBM Plex typography, spacing tokens, and interface specimens.",
		introduction: "Carbon is IBM’s open-source design system. Its foundations give product teams a shared vocabulary for layers, text, and interaction. This reference uses the White theme and fixed typography styles to show how a quiet grid can support detailed information.",
		theme: "White · fixed type styles", checked: "2026-10-19", website: "https://www.carbondesignsystem.com/",
		family: "IBM Plex Sans", previewFamily: "var(--font-sans)",
		fontNote: "These specimens use the IBM Plex Sans font already served by this site. The selected fixed styles retain their documented sizes and line heights. Carbon also has fluid styles that change with the viewport.",
		spacingNote: "Carbon’s spacing tokens start at 2px and grow to larger layout intervals. This selection shows seven steps. The token number identifies a place in the scale; it is not the pixel value.",
		colors: [
			{ token: "$background", value: "#ffffff", role: "Page background", source: "color" },
			{ token: "$layer-01", value: "#f4f4f4", role: "First layer", source: "color" },
			{ token: "$text-primary", value: "#161616", role: "Primary text", source: "color" },
			{ token: "$text-secondary", value: "#525252", role: "Secondary text", source: "color" },
			{ token: "$background-brand", value: "#0f62fe", role: "Brand background", source: "color" },
			{ token: "$support-success", value: "#24a148", role: "Success indicator", source: "color" },
			{ token: "$support-error", value: "#da1e28", role: "Error indicator", source: "color" },
			{ token: "$border-subtle-00", value: "#e0e0e0", role: "Subtle border on background", source: "color" },
		],
		typography: [
			{ token: "$heading-04", label: "Heading 04", size: 28, lineHeight: 36, weight: 400, source: "type" },
			{ token: "$heading-03", label: "Heading 03", size: 20, lineHeight: 28, weight: 400, source: "type" },
			{ token: "$body-01", label: "Body 01", size: 14, lineHeight: 20, weight: 400, source: "type" },
		],
		spacing: [2,4,8,12,16,24,32].map((px, i) => ({ token: `$spacing-0${i+1}`, px, source: "space" })),
		principles: [
			{ title: "Make layers explicit", text: "The White theme uses white for the page and Gray 10 for the first layer. Carbon defines additional layer and border tokens for nested contexts. Match a border to its surrounding layer instead of assuming one gray fits every surface.", source: "color" },
			{ title: "Choose fixed or fluid typography", text: "Carbon distinguishes fixed headings from fluid styles. Fixed type keeps sizes predictable in product layouts; fluid type responds to viewport width. The examples here use fixed styles, including a regular-weight 28px heading.", source: "type" },
			{ title: "Use one scale across the layout", text: "The spacing scale applies to both margin and padding. A step such as spacing-05 is 16px. Keeping these decisions shared lets form controls, tables, and surrounding layout align without each component inventing its own measurements.", source: "space" },
		],
		takeaway: "For a data-heavy product, study how Carbon handles hierarchy with layers and type before adding decoration. A regular-weight heading can lead a page; clear alignment and a restrained action color can do the rest.",
		caveat: "The swatches show the White theme only. Carbon also documents other light and dark themes. A support color is not automatically a readable text color on white; check the intended role and the actual foreground/background pairing.",
		sources: [
			{ id: "overview", title: "Carbon Design System", url: "https://www.carbondesignsystem.com/", detail: "IBM’s system overview and implementation resources." },
			{ id: "color", title: "Carbon color tokens", url: "https://www.carbondesignsystem.com/building-blocks/foundations/color/tokens", detail: "White theme role/value tables." },
			{ id: "type", title: "Carbon type sets", url: "https://www.carbondesignsystem.com/building-blocks/foundations/typography/type-sets", detail: "IBM Plex family, fixed sizes, weights, and line heights." },
			{ id: "space", title: "Carbon spacing", url: "https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview", detail: "Spacing token names and values." },
		],
		preview: { action: "#0f62fe", ink: "#161616", muted: "#525252", surface: "#f4f4f4", border: "#e0e0e0", radius: "0px", button: "Create report", title: "Clarity at every scale.", eyebrow: "DATA / OVERVIEW" },
	},
	{
		slug: "govuk", name: "GOV.UK Design System", company: "GOV.UK", monogram: "UK", category: "Public services",
		description: "A visual guide to the GOV.UK Design System: functional colors, responsive type, spacing, and accessible service patterns.",
		introduction: "The GOV.UK Design System documents styles, components, and patterns for public services. Its visual foundations put readable content and recognizable interactions at the center of a task. This reference shows functional colors, the responsive type scale, and selected static spacing values.",
		theme: "Default · functional colors", checked: "2026-10-19", website: "https://design-system.service.gov.uk/",
		family: "GDS Transport (restricted use)", previewFamily: "Arial, sans-serif",
		fontNote: "The official typeface is GDS Transport, with restrictions on where it may be used. We use Arial here and do not redistribute GDS Transport or GOV.UK branding. The scale is documented; the letterforms are a substitute.",
		spacingNote: "These are static govuk-spacing values. GOV.UK also has a responsive scale: unit 6, for example, is 20px on small screens and 30px on large screens. Do not treat the static and responsive helpers as interchangeable.",
		colors: [
			{ token: "body-background", value: "#ffffff", role: "Body background", source: "color" },
			{ token: "surface-background", value: "#f4f8fb", role: "Surface background", source: "color" },
			{ token: "text", value: "#0b0c0c", role: "Text", source: "color" },
			{ token: "secondary-text", value: "#484949", role: "Secondary text", source: "color" },
			{ token: "link", value: "#1a65a6", role: "Link", source: "color" },
			{ token: "focus", value: "#ffdd00", role: "Keyboard focus only", source: "color" },
			{ token: "success", value: "#0f7a52", role: "Success", source: "color" },
			{ token: "error", value: "#ca3535", role: "Error", source: "color" },
		],
		typography: [
			{ token: "govuk-heading-l", label: "Heading large", size: 36, lineHeight: 40, smallSize: 27, smallLineHeight: 30, weight: 700, source: "type" },
			{ token: "govuk-heading-m", label: "Heading medium", size: 24, lineHeight: 30, smallSize: 21, smallLineHeight: 25, weight: 700, source: "type" },
			{ token: "govuk-body", label: "Body", size: 19, lineHeight: 25, weight: 400, source: "type" },
		],
		spacing: [5,10,15,20,25,30,40].map((px, i) => ({ token: `govuk-spacing(${i+1})`, px, source: "space" })),
		principles: [
			{ title: "Reserve focus color for focus", text: "The functional palette assigns yellow to keyboard focus. It has a specific interaction meaning. Keep it available for that role instead of using it as a generic highlight in content or decoration.", source: "color" },
			{ title: "Keep body text readable", text: "The documented body style is 19px with a 25px line height. Larger headings adapt on smaller screens. This makes the hierarchy responsive without requiring every text role to shrink with the viewport.", source: "type" },
			{ title: "Distinguish fixed and responsive space", text: "Static spacing remains the same at every width. Responsive spacing changes selected values between small and large screens. Choose the helper based on the relationship between elements, rather than converting every gap to a fixed number.", source: "space" },
		],
		takeaway: "For a service that asks people to complete a task, borrow the emphasis on clear labels, readable text, and visible focus. Use the documentation’s patterns to examine the whole user journey; matching a color palette alone does not produce an accessible service.",
		caveat: "This is an independent educational specimen, not a government service. Functional color names are inputs to govuk-functional-colour(). Font weights reflect the heading/body styles; the linked type-scale page supplies their sizes and responsive line heights.",
		sources: [
			{ id: "color", title: "GOV.UK colour", url: "https://design-system.service.gov.uk/styles/colour/", detail: "Current functional color names and exact hex values." },
			{ id: "type", title: "GOV.UK type scale", url: "https://design-system.service.gov.uk/styles/type-scale/", detail: "Small and large screen sizes and line heights." },
			{ id: "headings", title: "GOV.UK headings", url: "https://design-system.service.gov.uk/styles/headings/", detail: "Heading classes and their use in a page hierarchy." },
			{ id: "font", title: "GOV.UK typeface", url: "https://design-system.service.gov.uk/styles/typeface/", detail: "GDS Transport usage restrictions." },
			{ id: "space", title: "GOV.UK spacing", url: "https://design-system.service.gov.uk/styles/spacing/", detail: "Static and responsive spacing tables and helpers." },
		],
		preview: { action: "#0f7a52", ink: "#0b0c0c", muted: "#484949", surface: "#f4f8fb", border: "#cecece", radius: "0px", button: "Continue", title: "Make the next step clear.", eyebrow: "SERVICE / YOUR DETAILS" },
	},
];
