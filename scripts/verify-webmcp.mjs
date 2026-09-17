// Verifies the WebMCP tools of a page end to end, through the browser's own API:
// starts headless Chrome with WebMCP enabled, lists the tools with `document.modelContext.getTools()`
// and calls each one with `executeTool()`, the way an agent does.
//
//   node scripts/verify-webmcp.mjs [url]
//
// Needs Node 22+ (global WebSocket) and Google Chrome 149+.

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.argv[2] ?? "https://styleguide.fyi/";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const REGISTRATION_WAIT_MS = 1500;

const SAMPLE_INPUTS = {
	"list-sections": {},
	"get-section": { section: "errors" },
	"search-rules": { query: "swallow" },
	"get-styleguide": {},
};

const userDataDir = await mkdtemp(join(tmpdir(), "verify-webmcp-"));
const chrome = spawn(CHROME, [
	"--headless=new",
	"--remote-debugging-port=0",
	`--user-data-dir=${userDataDir}`,
	"--no-first-run",
	"--enable-features=WebMCPTesting",
	"--enable-experimental-web-platform-features",
	"about:blank",
]);

async function cleanUp() {
	chrome.kill();
	await rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

const browserWsUrl = await new Promise((resolve, reject) => {
	let stderr = "";
	chrome.stderr.on("data", (chunk) => {
		stderr += chunk;
		const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
		if (match) resolve(match[1]);
	});
	chrome.on("exit", (code) => reject(new Error(`Chrome exited with code ${code} before DevTools was ready:\n${stderr}`)));
});

const socket = new WebSocket(browserWsUrl);
await new Promise((resolve, reject) => {
	socket.addEventListener("open", resolve, { once: true });
	socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const eventWaiters = [];

socket.addEventListener("message", ({ data }) => {
	const message = JSON.parse(data);
	if (message.id) {
		const { resolve, reject } = pending.get(message.id);
		pending.delete(message.id);
		if (message.error) reject(new Error(`${message.error.message} (CDP ${message.error.code})`));
		else resolve(message.result);
		return;
	}
	const waiterIndex = eventWaiters.findIndex((waiter) => waiter.method === message.method);
	if (waiterIndex >= 0) eventWaiters.splice(waiterIndex, 1)[0].resolve(message.params);
});

function send(method, params = {}, sessionId) {
	const id = nextId++;
	socket.send(JSON.stringify({ id, method, params, sessionId }));
	return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

function waitForEvent(method) {
	return new Promise((resolve) => eventWaiters.push({ method, resolve }));
}

// Runs in the page.
async function inspectPage(sampleInputs) {
	const modelContext = document.modelContext ?? navigator.modelContext;
	const entryPoint = document.modelContext ? "document.modelContext" : navigator.modelContext ? "navigator.modelContext" : null;
	const pageStatus = document.querySelector("#webmcp-status")?.textContent ?? null;
	if (!modelContext) return { entryPoint, pageStatus, tools: [], calls: [] };

	const registered = await modelContext.getTools();
	const calls = [];
	for (const tool of registered) {
		try {
			const input = sampleInputs[tool.name] ?? {};
			let result;
			let inputFormat = "object";
			try {
				result = await modelContext.executeTool(tool, input);
			} catch (error) {
				// The spec takes an object. Chrome builds before that change take a JSON string.
				if (!String(error).includes("parse input")) throw error;
				inputFormat = "JSON string";
				result = await modelContext.executeTool(tool, JSON.stringify(input));
			}
			calls.push({ name: tool.name, ok: true, result, inputFormat });
		} catch (error) {
			calls.push({ name: tool.name, ok: false, error: String(error) });
		}
	}

	return {
		entryPoint,
		pageStatus,
		tools: registered.map(({ name, title, description, inputSchema, annotations, origin }) => ({
			name,
			title,
			description,
			inputSchema,
			annotations,
			origin,
		})),
		calls,
		filterAfterCalls: document.querySelector("#rule-filter")?.value ?? null,
	};
}

let exitCode = 0;
try {
	const { targetId } = await send("Target.createTarget", { url: "about:blank" });
	const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
	await send("Page.enable", {}, sessionId);

	const loaded = waitForEvent("Page.loadEventFired");
	await send("Page.navigate", { url }, sessionId);
	await loaded;
	await new Promise((resolve) => setTimeout(resolve, REGISTRATION_WAIT_MS));

	const evaluation = await send(
		"Runtime.evaluate",
		{
			expression: `(${inspectPage})(${JSON.stringify(SAMPLE_INPUTS)})`,
			awaitPromise: true,
			returnByValue: true,
		},
		sessionId,
	);
	if (evaluation.exceptionDetails) {
		throw new Error(`Page script threw: ${evaluation.exceptionDetails.exception?.description ?? evaluation.exceptionDetails.text}`);
	}

	const report = evaluation.result.value;
	console.log(`URL:         ${url}`);
	console.log(`Entry point: ${report.entryPoint ?? "none (WebMCP is not exposed in this Chrome)"}`);
	console.log(`Page status: ${report.pageStatus}`);
	console.log(`Tools:       ${report.tools.map((tool) => tool.name).join(", ") || "none"}\n`);

	for (const call of report.calls) {
		const preview = call.ok ? String(call.result).slice(0, 300).replace(/\n/g, "\\n") : call.error;
		const format = call.ok ? `  [input as ${call.inputFormat}]` : "";
		console.log(`${call.ok ? "PASS" : "FAIL"}  ${call.name}(${JSON.stringify(SAMPLE_INPUTS[call.name] ?? {})})${format}`);
		console.log(`      ${preview}${call.ok && String(call.result).length > 300 ? "…" : ""}\n`);
	}
	if (report.calls.length > 0) console.log(`Filter box after the calls: ${JSON.stringify(report.filterAfterCalls)}`);

	const expected = Object.keys(SAMPLE_INPUTS);
	const missing = expected.filter((name) => !report.tools.some((tool) => tool.name === name));
	const failed = report.calls.filter((call) => !call.ok);
	if (missing.length > 0 || failed.length > 0) {
		console.error(`\nFAILED. Missing tools: ${missing.join(", ") || "none"}. Failed calls: ${failed.map((call) => call.name).join(", ") || "none"}.`);
		exitCode = 1;
	} else {
		console.log("\nAll tools are registered and callable.");
	}
} catch (error) {
	console.error(error);
	exitCode = 1;
} finally {
	socket.close();
	await cleanUp();
}
process.exit(exitCode);
