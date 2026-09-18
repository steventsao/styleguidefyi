// Verifies the WebMCP tools of a page end to end, through the browser's own API:
// starts headless Chrome with WebMCP enabled, lists the tools with `document.modelContext.getTools()`
// and calls each one with `executeTool()`, the way an agent does.
//
//   node scripts/verify-webmcp.mjs [url] [--output path/to/results.json]
//
// Needs Node 22+ (global WebSocket) and Google Chrome 149+.

import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { assertWebMcpReport } from "./webmcp-results.mjs";

const { values, positionals } = parseArgs({
	options: { output: { type: "string", default: ".webmcp-results/latest.json" } },
	allowPositionals: true,
});
if (positionals.length > 1) throw new Error("Usage: node scripts/verify-webmcp.mjs [url] [--output path]");
const url = positionals[0] ?? "https://styleguide.fyi/";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const REGISTRATION_WAIT_MS = 1500;

const CASES = [
	...JSON.parse(await readFile(new URL("./fixtures/exec-cases.json", import.meta.url), "utf8")),
	...JSON.parse(await readFile(new URL("./fixtures/guide-tool-cases.json", import.meta.url), "utf8")),
];

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
async function inspectPage(cases) {
	const modelContext = document.modelContext ?? navigator.modelContext;
	const entryPoint = document.modelContext ? "document.modelContext" : navigator.modelContext ? "navigator.modelContext" : null;
	const pageStatus = document.querySelector("#webmcp-status")?.textContent ?? null;
	if (!modelContext) return { entryPoint, pageStatus, tools: [], calls: [] };

	const registered = await modelContext.getTools();
	const calls = [];
	for (const test of cases) {
		try {
			const tool = registered.find((candidate) => candidate.name === test.tool);
			if (!tool) throw new Error(`Tool ${test.tool} is not registered`);
			let result;
			try {
				result = await modelContext.executeTool(tool, test.input);
			} catch (error) {
				// Earlier Chrome builds expect JSON strings instead of objects.
				if (!String(error).includes("parse input")) throw error;
				result = await modelContext.executeTool(tool, JSON.stringify(test.input));
			}
			if (typeof result === "string") {
				try { result = JSON.parse(result); }
				catch { /* A markdown result may already be a decoded string. */ }
			}
			calls.push({ label: test.label, tool: test.tool, input: test.input, result });
		} catch (error) {
			calls.push({ label: test.label, tool: test.tool, input: test.input, error: String(error) });
		}
	}
	return { entryPoint, pageStatus, tools: registered.map(({ name }) => name), calls };
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
			expression: `(${inspectPage})(${JSON.stringify(CASES.map(({ label, tool, input }) => ({ label, tool, input })))})`,
			awaitPromise: true,
			returnByValue: true,
		},
		sessionId,
	);
	if (evaluation.exceptionDetails) {
		throw new Error(`Page script threw: ${evaluation.exceptionDetails.exception?.description ?? evaluation.exceptionDetails.text}`);
	}

	const report = evaluation.result.value;
	// Save full responses even when assertions fail. Expectations stay in a separate file.
	await mkdir(dirname(values.output), { recursive: true });
	await writeFile(values.output, JSON.stringify({ url, ...report }, null, 2) + "\n");
	console.log(`URL:         ${url}`);
	console.log(`Captured:    ${values.output}`);
	console.log(`Entry point: ${report.entryPoint ?? "none (WebMCP is not exposed in this Chrome)"}`);
	console.log(`Page status: ${report.pageStatus}`);
	console.log(`Tools:       ${report.tools.join(", ") || "none"}\n`);
	assertWebMcpReport(report, CASES);
	for (const call of report.calls) console.log(`PASS  ${call.label} (exact result)`);
	console.log(`\nAll five tools are registered; all ${CASES.length} captured results match the reviewed fixtures.`);
} catch (error) {
	console.error(error);
	exitCode = 1;
} finally {
	socket.close();
	await cleanUp();
}
process.exit(exitCode);
