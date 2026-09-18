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

const url = process.argv[2] ?? "https://styleguidefyi-shell.steventsao.workers.dev/";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const REGISTRATION_WAIT_MS = 1500;

const CASES = [
	{ label: "list virtual files", input: { command: "ls /guide && ls /guide/sections" }, exitCode: 0, includes: "errors.md" },
	{ label: "read a section", input: { command: "cat sections/errors.md" }, exitCode: 0, includes: "### Never swallow an error." },
	{ label: "search with glob and pipe", input: { command: "grep -l 'permission' rules/*.md | sort" }, exitCode: 0, includes: "rules/parse-at-the-boundary.md" },
	{ label: "query the JSON index", input: { command: `jq '.sections[] | select(.id == "errors") | .rules[0].id' index.json` }, exitCode: 0, includes: "never-swallow" },
	{ label: "reject missing command", input: {}, exitCode: 2, errorIncludes: "command" },
	{ label: "reject writes", input: { command: "echo replaced > rules/never-swallow.md" }, exitCode: 1, errorIncludes: "read-only" },
	{ label: "preserve guide after rejected write", input: { command: "head -1 rules/never-swallow.md" }, exitCode: 0, includes: "### Never swallow an error." },
	{ label: "disable network commands", input: { command: "curl https://example.com" }, exitCode: 127 },
	{ label: "bound an infinite loop", input: { command: "while :; do :; done" }, nonzero: true, errorIncludes: "limit" },
	{ label: "recover after limit", input: { command: "pwd" }, exitCode: 0, includes: "/guide" },
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
	const tool = registered.find((candidate) => candidate.name === "exec");
	const calls = [];
	if (tool) for (const test of cases) {
		try {
			let result;
			try {
				result = await modelContext.executeTool(tool, test.input);
			} catch (error) {
				// Earlier Chrome builds expect JSON strings instead of objects.
				if (!String(error).includes("parse input")) throw error;
				result = await modelContext.executeTool(tool, JSON.stringify(test.input));
			}
			if (typeof result === "string") result = JSON.parse(result);
			const ok = typeof result.stdout === "string" && typeof result.stderr === "string" &&
				(test.nonzero ? result.exitCode !== 0 : result.exitCode === test.exitCode) &&
				(!test.includes || result.stdout.includes(test.includes)) &&
				(!test.errorIncludes || result.stderr.toLowerCase().includes(test.errorIncludes));
			calls.push({ label: test.label, ok, result });
		} catch (error) {
			calls.push({ label: test.label, ok: false, error: String(error) });
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
			expression: `(${inspectPage})(${JSON.stringify(CASES)})`,
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
	console.log(`Tools:       ${report.tools.join(", ") || "none"}\n`);
	for (const call of report.calls) {
		console.log(`${call.ok ? "PASS" : "FAIL"}  ${call.label}`);
		console.log(`      ${JSON.stringify(call.result ?? call.error).slice(0, 350)}\n`);
	}
	if (report.tools.length !== 1 || report.tools[0] !== "exec" || report.calls.length !== CASES.length || report.calls.some((call) => !call.ok)) {
		console.error("FAILED. Expected exactly one exec tool and all shell checks to pass.");
		exitCode = 1;
	} else {
		console.log("One exec tool registered; all shell checks passed through WebMCP.");
	}
} catch (error) {
	console.error(error);
	exitCode = 1;
} finally {
	socket.close();
	await cleanUp();
}
process.exit(exitCode);
