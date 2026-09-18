import { styleguide } from "../data/styleguide";
import { countRules, searchRules, styleguideToMarkdown } from "../lib/styleguide";
import { createShellTool, type WebMcpTool } from "../lib/webmcp-tools";
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

const COPIED_LABEL_MS = 1500;

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

const tools = [createShellTool(runShell)];

filterInput.addEventListener("input", () => applyFilter(filterInput.value));

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
		return;
	}

	const results = await Promise.allSettled(tools.map(async (tool) => modelContext.registerTool(tool)));
	const failures = results.filter((result) => result.status === "rejected");
	for (const failure of failures) {
		console.error("WebMCP tool registration failed:", failure.reason);
	}

	if (failures.length > 0) {
		setStatus("failed", "WebMCP is present, but exec did not register. See the console.");
		return;
	}
	setStatus("active", "WebMCP is active. One tool is registered: exec.");
}

registerTools();

// --- The Run form calls the same tool as the agent ---

for (const form of document.querySelectorAll<HTMLFormElement>("form[data-tool]")) {
	const tool = tools.find((candidate) => candidate.name === form.dataset.tool)!;
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
			output.textContent = JSON.stringify(result, null, 2);
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
	setTimeout(() => (copyButton.textContent = copyLabel), COPIED_LABEL_MS);
});
