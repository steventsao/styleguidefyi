import { styleguide } from "../data/styleguide";
import { EVENTS, track } from "../lib/analytics";
import { countRules, searchRules, styleguideToMarkdown } from "../lib/styleguide";
import { createTools, type PageActions, type WebMcpTool } from "../lib/webmcp-tools";
import { runShell } from "./shell-client";

interface ModelContext {
	registerTool(tool: WebMcpTool): Promise<void> | void;
}

declare global {
	interface Document {
		modelContext?: ModelContext;
	}
	interface Navigator {
		modelContext?: ModelContext;
	}
}

const REVEAL_HIGHLIGHT_MS = 2000;
const COPIED_LABEL_MS = 1500;
/** Long enough that a typed query reports once it settles, not once per keystroke. */
const SEARCH_SETTLE_MS = 900;
/** Below this a query is still being typed and says nothing about intent. */
const MIN_REPORTED_QUERY_LENGTH = 3;

const RULE_SECTIONS = new Map(
	styleguide.sections.flatMap((section) => section.rules.map((rule) => [rule.id, section.id] as const))
);
const SECTION_IDS = new Set(styleguide.sections.map((section) => section.id));

const filterInput = document.querySelector<HTMLInputElement>("#rule-filter")!;
const filterCount = document.querySelector<HTMLElement>("#filter-count")!;
const noMatches = document.querySelector<HTMLElement>("#no-matches")!;
const ruleElements = [...document.querySelectorAll<HTMLElement>("[data-rule]")];
const sectionElements = [...document.querySelectorAll<HTMLElement>("[data-section]")];

function applyFilter(query: string) {
	const isFiltering = query.trim() !== "";
	const matchingIds = new Set(searchRules(styleguide, query).map((match) => match.id));

	for (const rule of ruleElements) {
		rule.hidden = isFiltering && !matchingIds.has(rule.id);
	}
	for (const section of sectionElements) {
		section.hidden = !section.querySelector("[data-rule]:not([hidden])");
	}

	noMatches.hidden = !isFiltering || matchingIds.size > 0;
	filterCount.textContent = isFiltering ? `${matchingIds.size} of ${countRules(styleguide)} rules` : "";
}

const page: PageActions = {
	revealSection(sectionId) {
		filterInput.value = "";
		applyFilter("");

		const section = document.getElementById(sectionId);
		if (!section) return;
		section.scrollIntoView({ block: "start" });
		section.classList.add("is-revealed");
		setTimeout(() => section.classList.remove("is-revealed"), REVEAL_HIGHLIGHT_MS);
	},
	filterRules(query) {
		filterInput.value = query;
		applyFilter(query);
		document.getElementById("rules")?.scrollIntoView({ block: "start" });
	},
};

/**
 * Wraps each tool so a call reports itself. This covers a real agent and the Run
 * buttons alike, because both go through the same `execute`.
 */
function withTracking(tool: WebMcpTool, source: "agent" | "run-button"): WebMcpTool {
	return {
		...tool,
		execute: async (input) => {
			const result = await tool.execute(input);
			const failed = typeof result === "object" && result !== null && "error" in result;
			track(EVENTS.webmcpToolCalled, {
				tool: tool.name,
				source,
				failed,
				command: typeof input.command === "string" ? input.command : undefined,
				query: typeof input.query === "string" ? input.query : undefined,
				section: typeof input.sectionId === "string" ? input.sectionId : undefined,
			});
			return result;
		},
	};
}

const tools = createTools(styleguide, page, runShell).map((tool) => withTracking(tool, "agent"));

let searchTimer: ReturnType<typeof setTimeout> | undefined;

filterInput.addEventListener("input", () => {
	applyFilter(filterInput.value);
	clearTimeout(searchTimer);
	const query = filterInput.value.trim();
	if (query.length < MIN_REPORTED_QUERY_LENGTH) return;
	searchTimer = setTimeout(
		() => track(EVENTS.ruleSearched, { query, matches: searchRules(styleguide, query).length }),
		SEARCH_SETTLE_MS
	);
});

/**
 * Reports the rule or section behind the current hash. A search result links straight
 * to a rule anchor, so this is what says which rule earns the traffic.
 */
function trackHash(): void {
	const id = decodeURIComponent(location.hash.slice(1));
	if (!id) return;
	const section = RULE_SECTIONS.get(id);
	if (section) {
		track(EVENTS.ruleOpened, { rule: id, section });
		return;
	}
	if (SECTION_IDS.has(id)) track(EVENTS.sectionOpened, { section: id });
}

trackHash();
window.addEventListener("hashchange", trackHash);

// One listener for every outbound and data link, so a new link needs no new code.
document.addEventListener("click", (event) => {
	const link = (event.target as Element | null)?.closest?.("a");
	if (!(link instanceof HTMLAnchorElement)) return;

	const path = link.getAttribute("href") ?? "";
	if (path === "/styleguide.md" || path === "/consensus.json" || path === "/llms.txt") {
		track(EVENTS.dataEndpointOpened, { endpoint: path });
		return;
	}
	if (link.closest(".rule-sources")) {
		track(EVENTS.referenceOpened, { url: link.href, host: link.hostname, rule: link.closest("[data-rule]")?.id ?? null });
	}
});

// --- WebMCP registration ---

function setStatus(state: "active" | "unavailable" | "failed", message: string) {
	const status = document.querySelector<HTMLElement>("#webmcp-status")!;
	status.dataset.state = state;
	status.textContent = message;
}

async function registerTools() {
	// The spec moved the entry point from `navigator` to `document`; older Chrome builds still use `navigator`.
	const modelContext = document.modelContext ?? navigator.modelContext;
	if (!modelContext) {
		setStatus("unavailable", "This browser does not expose WebMCP. The tools below still run with the Run button.");
		track(EVENTS.webmcpDetected, { state: "unavailable", registered: 0, tools: tools.length });
		return;
	}

	const results = await Promise.allSettled(tools.map(async (tool) => modelContext.registerTool(tool)));
	const failures = results.filter((result) => result.status === "rejected");
	for (const failure of failures) {
		console.error("WebMCP tool registration failed:", failure.reason);
	}

	if (failures.length > 0) {
		setStatus("failed", `WebMCP is present, but ${failures.length} of ${tools.length} tools did not register. See the console.`);
		track(EVENTS.webmcpDetected, { state: "failed", registered: tools.length - failures.length, tools: tools.length });
		return;
	}
	setStatus("active", `WebMCP is active. ${tools.length} tools are registered, including exec.`);
	track(EVENTS.webmcpDetected, { state: "active", registered: tools.length, tools: tools.length });
}

registerTools();

// --- Run forms use the same tool implementations without scrolling or filtering the page ---

const previewTools = createTools(styleguide, { revealSection() {}, filterRules() {} }, runShell).map((tool) =>
	withTracking(tool, "run-button")
);

for (const form of document.querySelectorAll<HTMLFormElement>("form[data-tool]")) {
	const tool = previewTools.find((candidate) => candidate.name === form.dataset.tool)!;
	const output = form.querySelector<HTMLElement>(".tool-output")!;

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
		button.disabled = true;
		button.textContent = "Running…";
		output.hidden = false;
		output.textContent = "Running in the browser…";
		try {
			const input = Object.fromEntries(new FormData(form));
			const result = await tool.execute(input);
			output.textContent = typeof result === "string" ? result : JSON.stringify(result, null, 2);
		} finally {
			button.disabled = false;
			button.textContent = "Run";
		}
	});
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-shell-command]")) {
	button.addEventListener("click", () => {
		const command = document.querySelector<HTMLTextAreaElement>('textarea[name="command"]')!;
		command.value = button.dataset.shellCommand!;
		command.focus();
	});
}

// --- Copy as markdown ---

const copyButton = document.querySelector<HTMLButtonElement>("#copy-markdown")!;
const copyLabel = copyButton.textContent;

copyButton.addEventListener("click", async () => {
	await navigator.clipboard.writeText(styleguideToMarkdown(styleguide));
	copyButton.textContent = "Copied";
	track(EVENTS.guideCopied, { rules: countRules(styleguide), updated: styleguide.updated });
	setTimeout(() => (copyButton.textContent = copyLabel), COPIED_LABEL_MS);
});
