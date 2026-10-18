---
name: styleguide.fyi
description: The existing visual system for the coding guide and its reading pages.
colors:
  bg: "#fbfaf7"
  bg-raised: "#ffffff"
  text: "#1c1b19"
  text-secondary: "#55524c"
  muted: "#8a867e"
  border: "#e4e0d8"
  accent: "#c2410c"
  accent-soft: "#fdebe0"
  avoid: "#b42318"
  prefer: "#067647"
  code-bg: "#f4f2ec"
  bg-dark: "#121210"
  bg-raised-dark: "#1a1917"
  text-dark: "#ebe8e1"
  text-secondary-dark: "#b3aea3"
  muted-dark: "#7d796f"
  border-dark: "#2c2a26"
  accent-dark: "#fb923c"
  accent-soft-dark: "#2e1d10"
  avoid-dark: "#f97066"
  prefer-dark: "#47cd89"
  code-bg-dark: "#1a1917"
typography:
  display:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "clamp(2rem, 6vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  display-blog:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  headline-article:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-article:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.6
  code:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  inline: "4px"
  control: "6px"
  reveal: "2px"
spacing:
  step-8: "8px"
  step-12: "12px"
  step-16: "16px"
  step-24: "24px"
  step-32: "32px"
  step-48: "48px"
  step-64: "64px"
components:
  button-primary:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.bg}"
  button-secondary:
    backgroundColor: "{colors.bg-raised}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-secondary-hover:
    textColor: "{colors.accent}"
  email-input:
    backgroundColor: "{colors.bg-raised}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  navigation:
    textColor: "{colors.text-secondary}"
    height: "56px"
  rating:
    rounded: "{rounded.inline}"
    padding: "9px 10px"
  code-example:
    backgroundColor: "{colors.code-bg}"
    rounded: "{rounded.control}"
  article-row:
    padding: "36px 0"
---

# Design System: styleguide.fyi

## Overview

**Creative North Star: "A working coding guide"**

Readable text, concrete code examples, and visible source links define this site. IBM Plex Sans carries explanations; IBM Plex Mono identifies code and the wordmark. Warm neutral surfaces and restrained orange accents carry the same identity in light and dark appearances.

The guide, article index, long articles, and newsletter use the same shell and controls. Reading pages may adjust headline scale, line length, and column structure to suit their content. This record describes the implemented site; it does not authorize a new brand, a redesign, or changes to captured external guides.

**Key Characteristics:**

- Text leads, with code and source attribution close to the explanation.
- Warm light and dark neutrals share one orange interaction accent.
- Fine borders and spacing organize flat surfaces.
- Forms use visible labels, native controls, and direct status text.

Source authority: `src/layouts/Base.astro` supplies shared colors and controls; `astro.config.mjs` supplies fonts. Guide patterns live in `src/pages/index.astro`, `src/components/ConsensusTable.astro`, and `src/components/ReferenceCatalog.astro`. Reading extensions live in `src/pages/blog/` and `src/components/Newsletter.astro`. The sidecar's tonal ramps are generated swatch previews, not additional application tokens.

## Colors

### Primary

The burnt orange `accent` marks the wordmark suffix, interactive hover and focus, article categories, and evidence labels. Its softer companion `accent-soft` provides rule-reveal and selection backgrounds. Dark appearance uses their `-dark` counterparts through the same CSS custom properties.

### Neutral

`bg` is the warm page ground; `bg-raised` is the field and control surface. `text` is the strongest reading color, `text-secondary` supports descriptions and metadata, and `muted` supplies quieter guide metadata and link decorations. `border` separates content. `code-bg` groups code examples without lifting them off the page.

Dark appearance is selected by `prefers-color-scheme: dark`, not by a separate component palette. The suffixed tokens in the frontmatter document those existing media-query values; source CSS retains the unsuffixed custom-property names.

### Semantic signals

`prefer` and `avoid` distinguish recommended and discouraged examples and reviewer assessments. Ratings also use `accent` for partial disagreement and dashed neutral outlines for unrated or stale assessments. Newsletter errors use `avoid`. Keep the text labels: color does not carry the meaning alone.

**The Shared Palette Rule.** New reading surfaces use the shared CSS variables so their text, borders, controls, and interaction states follow both appearances together.

## Typography

IBM Plex Sans uses the configured system sans fallback; IBM Plex Mono uses the configured system monospace fallback. Both ship the observed weights (400, 500, 600). Use the font variables supplied by Astro rather than adding another font loader.

The `display` role belongs to the guide opening. `display-blog` and `headline-article` record the existing reading-page variants; they do not replace the guide heading. `title` is shared by article-index titles and newsletter headings. `body` is the global reading default; `body-article` supplies the more open long-form rhythm. `label` records the shared button treatment, and `code` records the guide code treatment. Metadata and navigation use the same label size with regular weight.

Article prose has a maximum measure of 70ch, descriptions use 58–64ch, and the guide lede uses 60ch. Article section headings are smaller than page titles, with a tighter line height. Code preserves whitespace and scrolls horizontally when necessary.

**The Two Fonts Rule.** Keep prose in the sans family and code, technical labels, and the wordmark in the mono family.

## Layout

The shared maximum page width is 1080px. The sticky header is 56px tall and uses 16px horizontal insets. Main guide content pairs a 220px sidebar with a flexible text column and a 56px gap; at 860px and below it becomes one column and removes the guide table of contents.

The blog index uses 24px side insets, an editorial heading, and border-separated article rows. Desktop rows pair a 180px metadata column with content, separated by 36px. At 640px and below, rows stack and page insets become 20px.

Articles pair a 200px table of contents with a flexible body and a 48px gap. At 760px and below the navigation moves into the reading flow; its links use two columns until 440px, then one. Code overflow stays inside its code block.

Newsletter copy and form share two columns with a 48px gap. At 720px and below they stack with a 24px gap. Below 380px, the email field and submit button stack as well. The submit button has a 46px minimum height.

The header reduces secondary destinations at 820px, drops its GitHub icon at 420px, and reduces the wordmark size at 360px. The footer wraps its links naturally. These are content-specific breakpoints, not a fabricated universal device scale.

The spacing entries record recurring observed steps; source CSS also contains component-specific padding and gaps. Preserve useful reading rhythm instead of normalizing every value to one new scale.

## Elevation & Depth

Surfaces are flat. Fine borders, code backgrounds, and whitespace separate content; there are no raised card shadows. The sticky header uses an 88% page-background mix with an 8px backdrop blur and a bottom border. Revealed guide rules use the existing accent-soft spread (`0 0 0 12px var(--accent-soft)`) to emphasize their target, not to imply elevation.

Keyboard focus uses a 2px accent outline with a 2px offset. Anchor scrolling is smooth by default and returns to normal scrolling under `prefers-reduced-motion: reduce`. The shared controls do not introduce timed motion effects.

## Shapes

Controls and code containers use the shared gently rounded `control` radius. Inline code and rating badges use the smaller `inline` radius. Rule-reveal highlighting uses `reveal`. Borders are normally one pixel; code-example panels add a three-pixel left edge for their semantic label. Editorial lists and newsletter sections use rules and open spacing rather than rounded enclosing cards.

## Components

### Buttons

Primary actions invert the text and page colors; hover switches the fill and border to the accent. Secondary actions use the raised background and a neutral border, changing text and border to the accent on hover. Both retain the shared font, padding, radius, and visible focus outline. The newsletter submit action adds its observed minimum height and uses reduced opacity with a waiting cursor while disabled.

### Fields

Inputs use the raised surface, text color, border, and shared radius. The newsletter email input uses the body font and an explicit label. Its placeholder stays secondary text, consent is a separate required native checkbox, and status follows the form in a polite live region. Error text uses the semantic error color; the private unsubscribe link is a plain link after successful signup. Keep launch-list wording truthful about email delivery.

The guide filter and consensus inputs have smaller, denser padding and type. This record preserves those incumbent variants rather than standardizing them during a blog extension.

### Navigation

The mono wordmark has an accent-colored suffix. Header links use secondary text without underlines, turn accent on hover, and keep the global focus outline. The skip link becomes visible on keyboard focus. Article breadcrumbs and table of contents are text links; the table of contents is sticky only where the desktop layout has room.

### Ratings and code examples

Rating disclosures combine text, a semantic tint, a fine border, and a small corner radius. Unrated and stale entries use dashed borders. Code examples pair a mono uppercase label with a matching colored left edge; the label remains visible even without color. Neither pattern acquires a decorative shadow.

### Article rows

Article lists are editorial rows with a bottom rule, metadata, a balanced title, summary, and a text reading link. The same shared colors and link states apply. Long-form pages reuse those patterns for related reading and related guide rules.

## Do's and Don'ts

### Do:

- Do reuse the shared palette, font variables, buttons, and focus treatment in both color schemes.
- Do keep readable line lengths and let editorial layouts collapse to a clear single reading order.
- Do keep semantic labels beside their colors and visible labels beside form controls.
- Do preserve source links, rule anchors, and honest wording about what the product can do.

### Don't:

- Don't add a new font, palette, shadow system, or card treatment as part of an ordinary extension.
- Don't replace the guide's established heading and field variants with the blog's larger reading variants.
- Don't present generated tonal-ramp previews as additional application colors.
- Don't invent endorsements, subscriber counts, author credentials, or delivery capabilities.
