import { App, applyDocumentTheme, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import { OpenAIExtensions } from "@openai/mcp-extensions/app";
import "@openai/mcp-extensions/app/styles.css";
import "./app.css";
import type { guideOverview, ruleDetail, searchGuideRules, sectionDetail } from "./catalog";

type Overview = ReturnType<typeof guideOverview>;
type RuleView = NonNullable<ReturnType<typeof ruleDetail>>;
type SectionView = NonNullable<ReturnType<typeof sectionDetail>>;
type SearchView = ReturnType<typeof searchGuideRules>;
type GuideView = Overview | RuleView | SectionView | SearchView;

const app = new App({ name: "styleguide.fyi", version: "1.0.0" });
const extensions = new OpenAIExtensions(app);
const root = document.getElementById("app");
if (!root) throw new Error("Missing app root");

let view: GuideView | null = null;
let overview: Overview | null = null;
let error = "";
let busy = false;
let requestNumber = 0;
let deepLinkSeen = "";

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text) node.textContent = text;
	return node;
}

function button(label: string, action: () => void | Promise<void>, className = "btn btn-secondary cursor-interaction"): HTMLButtonElement {
	const node = element("button", className, label);
	node.type = "button";
	node.addEventListener("click", () => void action());
	return node;
}

function isGuideView(value: unknown): value is GuideView {
	if (typeof value !== "object" || value === null || !("kind" in value)) return false;
	return value.kind === "overview" || value.kind === "rule" || value.kind === "section" || value.kind === "search";
}

function acceptResult(value: unknown): void {
	if (!isGuideView(value)) {
		error = "The guide returned an unexpected result.";
		render();
		return;
	}
	view = value;
	if (value.kind === "overview") overview = value;
	error = "";
	render();
}

async function callTool(name: string, args: Record<string, unknown> = {}): Promise<void> {
	const current = ++requestNumber;
	busy = true;
	error = "";
	render();
	try {
		const result = await app.callServerTool({ name, arguments: args });
		if (current !== requestNumber) return;
		if (result.isError) throw new Error(result.content?.find((item) => item.type === "text")?.text ?? "The guide request failed.");
		acceptResult(result.structuredContent);
	} catch (cause) {
		if (current !== requestNumber) return;
		error = cause instanceof Error ? cause.message : "The guide request failed.";
	} finally {
		if (current === requestNumber) {
			busy = false;
			render();
		}
	}
}

async function goHome(): Promise<void> {
	if (overview) {
		view = overview;
		error = "";
		render();
	} else {
		await callTool("browse_guide");
	}
}

function openSource(url: string): void {
	void app.openLink({ url }).then(({ isError }) => {
		if (!isError) return;
		error = `Could not open ${url}`;
		render();
	}).catch(() => {
		error = `Could not open ${url}`;
		render();
	});
}

async function addToChat(rule: RuleView["rule"]): Promise<void> {
	if (!extensions.modelContext) return;
	try {
		await extensions.modelContext.update({
			content: [{ type: "text", text: `${rule.markdown}\n\nSource: ${rule.url}` }],
			structuredContent: { ruleId: rule.id, source: rule.url },
		});
		const status = document.getElementById("context-status");
		if (status) status.textContent = "Added to this conversation’s context.";
	} catch {
		const status = document.getElementById("context-status");
		if (status) status.textContent = "Could not add this rule to the conversation.";
	}
}

function renderHeader(container: HTMLElement): void {
	const header = element("header", "app-header");
	const brand = element("div", "brand");
	brand.append(element("span", "brand-mark", "sg"), element("div", "brand-copy"));
	brand.lastElementChild?.append(element("strong", "brand-name", "styleguide.fyi"), element("span", "brand-subtitle", "A common coding style guide"));
	header.append(brand);
	if (view?.kind !== "overview") header.append(button("All rules", goHome, "btn btn-secondary cursor-interaction home-button"));
	container.append(header);
}

function renderSearch(container: HTMLElement): void {
	const form = element("form", "search-form");
	const label = element("label", "search-label", "Find a rule");
	label.htmlFor = "rule-search";
	const row = element("div", "search-row");
	const input = element("input", "form-control search-input");
	input.id = "rule-search";
	input.type = "search";
	input.placeholder = "Search naming, errors, tests…";
	input.autocomplete = "off";
	input.value = view?.kind === "search" ? view.query : "";
	const submit = element("button", "btn btn-primary cursor-interaction", "Search");
	submit.type = "submit";
	submit.disabled = busy;
	row.append(input, submit);
	form.append(label, row);
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const query = input.value.trim();
		if (query) void callTool("search_rules", { query });
		else void goHome();
	});
	container.append(form);
}

function renderOverview(container: HTMLElement, data: Overview): void {
	const intro = element("div", "intro");
	intro.append(element("p", "eyebrow", `${data.ruleCount} rules · updated ${data.updated}`), element("h1", "page-title", "Coding style guide."));
	intro.append(element("p", "muted", "Practical defaults with reasons and examples. Choose a section or search for a rule."));
	container.append(intro);
	const grid = element("div", "section-grid");
	for (const section of data.sections) {
		const card = element("section", "card section-card");
		const heading = element("div", "section-heading");
		heading.append(element("h2", "section-title", section.title), element("span", "count", String(section.rules.length)));
		card.append(heading);
		if (section.summary) card.append(element("p", "muted", section.summary));
		const list = element("ul", "rule-list");
		for (const rule of section.rules) {
			const item = element("li");
			item.append(button(rule.title, () => callTool("get_rule", { id: rule.id }), "rule-button cursor-interaction"));
			list.append(item);
		}
		card.append(list, button("View section", () => callTool("get_section", { id: section.id }), "section-link cursor-interaction"));
		grid.append(card);
	}
	container.append(grid);
}

function renderRule(container: HTMLElement, data: RuleView): void {
	const rule = data.rule;
	const article = element("article", "card detail-card");
	article.append(element("p", "eyebrow", rule.section.title), element("h1", "detail-title", rule.title), element("p", "rationale", rule.why));
	if (rule.avoid) article.append(codeExample("Avoid", rule.avoid, rule.lang, "avoid"));
	if (rule.prefer) article.append(codeExample("Prefer", rule.prefer, rule.lang, "prefer"));
	if (rule.references.length) {
		const sources = element("div", "sources");
		sources.append(element("h2", "small-heading", "Sources"));
		for (const reference of rule.references) {
			const link = button(`${reference.title} · ${reference.by}`, () => openSource(reference.url), "source-link cursor-interaction");
			sources.append(link);
		}
		article.append(sources);
	}
	const reviews = element("section", "reviews");
	reviews.append(element("h2", "small-heading", "Reviewer assessments"));
	for (const review of rule.reviews) {
		const row = element("div", "review");
		const label = review.status === "outdated" ? `${review.label} · needs review` : review.label;
		row.append(element("strong", "review-name", review.name), element("span", "review-label", label));
		if (review.rationale) row.append(element("p", "review-rationale", review.rationale));
		reviews.append(row);
	}
	article.append(reviews);
	const actions = element("div", "detail-actions");
	if (extensions.modelContext) actions.append(button("Add to chat", () => addToChat(rule), "btn btn-primary cursor-interaction"));
	actions.append(button("Open on site", () => openSource(rule.url)));
	article.append(actions, element("p", "status", ""));
	article.lastElementChild!.id = "context-status";
	container.append(article);
}

function codeExample(label: string, code: string, lang: string, variant: string): HTMLElement {
	const wrapper = element("section", `example ${variant}`);
	wrapper.append(element("h2", "small-heading", label));
	const pre = element("pre");
	const codeNode = element("code", `language-${lang}`, code);
	pre.append(codeNode);
	wrapper.append(pre);
	return wrapper;
}

function renderSection(container: HTMLElement, data: SectionView): void {
	const section = data.section;
	const head = element("div", "intro");
	head.append(element("p", "eyebrow", `${section.rules.length} rules`), element("h1", "detail-title", section.title));
	if (section.summary) head.append(element("p", "muted", section.summary));
	container.append(head);
	const list = element("div", "section-rule-list");
	for (const rule of section.rules) {
		const card = element("section", "card rule-summary");
		card.append(element("h2", "section-title", rule.title), element("p", "muted", rule.why), button("Read rule", () => callTool("get_rule", { id: rule.id }), "section-link cursor-interaction"));
		list.append(card);
	}
	container.append(list);
}

function renderMatches(container: HTMLElement, data: SearchView): void {
	container.append(element("p", "eyebrow", `${data.matches.length} results`), element("h1", "detail-title", `Results for “${data.query}”`));
	if (!data.matches.length) {
		container.append(element("p", "empty", "No rules found. Try a broader word or browse all sections."));
		return;
	}
	const list = element("div", "section-rule-list");
	for (const match of data.matches) {
		const card = element("section", "card rule-summary");
		card.append(element("p", "eyebrow", match.section), element("h2", "section-title", match.title), element("p", "muted", match.why));
		card.append(button("Read rule", () => callTool("get_rule", { id: match.id }), "section-link cursor-interaction"));
		list.append(card);
	}
	container.append(list);
}

function render(): void {
	root.replaceChildren();
	const shell = element("div", "app-shell");
	renderHeader(shell);
	const main = element("main", "main-content");
	renderSearch(main);
	if (error) main.append(element("p", "error-banner", error));
	if (!view) main.append(element("p", "loading", busy ? "Loading guide…" : "Open a rule to start reading."));
	else if (view.kind === "overview") renderOverview(main, view);
	else if (view.kind === "rule") renderRule(main, view);
	else if (view.kind === "section") renderSection(main, view);
	else renderMatches(main, view);
	shell.append(main, element("footer", "footer", "Guide rules are proposed defaults. Follow your project’s instructions first."));
	root.append(shell);
}

function applyHostContext(context: ReturnType<App["getHostContext"]>): void {
	if (context?.theme != null) applyDocumentTheme(context.theme);
	if (context?.styles?.variables != null) applyHostStyleVariables(context.styles.variables);
}

function applyDeepLink(): void {
	const link = extensions.deepLink.getCurrent()?.url;
	if (!link || link === deepLinkSeen) return;
	deepLinkSeen = link;
	try {
		const url = new URL(link, "https://styleguide.fyi");
		const match = url.pathname.match(/^\/(rules|sections)\/([a-z0-9-]+)\/?$/);
		if (match?.[1] === "rules") void callTool("get_rule", { id: match[2] });
		else if (match?.[1] === "sections") void callTool("get_section", { id: match[2] });
		else if (url.searchParams.has("q")) void callTool("search_rules", { query: url.searchParams.get("q") ?? "" });
		else void goHome();
	} catch {
		void goHome();
	}
}

app.ontoolresult = (result) => {
	if (result.isError) {
		error = result.content?.find((item) => item.type === "text")?.text ?? "The guide request failed.";
		render();
	} else acceptResult(result.structuredContent);
};
app.addEventListener("hostcontextchanged", (context) => {
	applyHostContext(context);
	applyDeepLink();
	render();
});
render();
void app.connect().then(() => {
	applyHostContext(app.getHostContext());
	applyDeepLink();
	if (!view && !busy) void callTool("browse_guide");
	else render();
}).catch((cause) => {
	error = cause instanceof Error ? cause.message : "Could not connect to the guide.";
	render();
});
