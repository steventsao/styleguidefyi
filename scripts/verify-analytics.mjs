// Verifies the analytics of a page end to end: starts headless Chrome, drives the page
// the way a reader does, and reads the event names out of the requests PostHog sends.
// It asserts on the browser's own traffic, so it needs no PostHog key and waits on no ingest.
//
//   node scripts/verify-analytics.mjs [url]
//
// Needs Node 22+ (global WebSocket) and Google Chrome.

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

const { positionals } = parseArgs({ allowPositionals: true });
if (positionals.length > 1) throw new Error("Usage: node scripts/verify-analytics.mjs [url]");
const url = positionals[0] ?? "https://styleguide.fyi/";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
/** PostHog batches captures on a timer. This covers the batch plus the network round trip. */
const FLUSH_WAIT_MS = 6000;
const SETTLE_WAIT_MS = 2000;

/** Every event the page must send for one reader session that touches each surface. */
const EXPECTED_EVENTS = [
	"$pageview",
	"rule_opened",
	"rule_searched",
	"guide_copied",
	"webmcp_detected",
	"webmcp_tool_called",
	"consensus_searched",
];

// PostHog drops every capture from a user agent that says "HeadlessChrome", so a
// verifier that kept the default would watch a page that reports nothing and call it broken.
const READER_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const userDataDir = await mkdtemp(join(tmpdir(), "verify-analytics-"));
const chrome = spawn(CHROME, [
	"--headless=new",
	"--remote-debugging-port=0",
	`--user-data-dir=${userDataDir}`,
	"--no-first-run",
	`--user-agent=${READER_USER_AGENT}`,
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

// Installed before the page's own scripts. PostHog sends captures with `fetch` and with
// `sendBeacon`, and the DevTools network domain does not report every one of them, so the
// verifier reads the bodies from the page rather than from the wire.
const RECORD_CAPTURES = `(${function recordCaptures() {
	const bodies = (window.__captureBodies = []);

	// PostHog gzips a capture into an ArrayBuffer, so hand base64 back and let Node unpack it.
	const asText = (body) => {
		const buffer = body instanceof ArrayBuffer ? body : ArrayBuffer.isView(body) ? body.buffer : undefined;
		if (!buffer) return String(body);
		let binary = "";
		for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
		return btoa(binary);
	};

	const keep = (url, body) => {
		if (typeof url === "string" && url.includes("i.posthog.com") && body) bodies.push(asText(body));
	};

	const { fetch: originalFetch } = window;
	window.fetch = function (input, init) {
		keep(typeof input === "string" ? input : input?.url, init?.body);
		return originalFetch.apply(this, arguments);
	};

	const originalBeacon = navigator.sendBeacon?.bind(navigator);
	if (originalBeacon) {
		navigator.sendBeacon = function (url, body) {
			keep(url, body);
			return originalBeacon(url, body);
		};
	}

	const originalSend = XMLHttpRequest.prototype.send;
	const originalOpen = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function (method, url) {
		this.__url = url;
		return originalOpen.apply(this, arguments);
	};
	XMLHttpRequest.prototype.send = function (body) {
		keep(this.__url, body);
		return originalSend.apply(this, arguments);
	};
}})()`;

function send(method, params = {}, sessionId) {
	const id = nextId++;
	socket.send(JSON.stringify({ id, method, params, sessionId }));
	return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

function waitForEvent(method) {
	return new Promise((resolve) => eventWaiters.push({ method, resolve }));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads the event names out of one PostHog request body. The client sends JSON, a form
 * field holding base64, and gzip of either, depending on what the server negotiates.
 */
function eventNames(body) {
	const candidates = [body];
	const form = new URLSearchParams(body.startsWith("data=") ? body : "").get("data");
	if (form) candidates.push(form);

	for (const candidate of candidates) {
		for (const decoded of [candidate, decodeBase64(candidate)]) {
			if (decoded === undefined) continue;
			const parsed = parseJson(decoded);
			if (parsed === undefined) continue;
			const batch = Array.isArray(parsed) ? parsed : (parsed.batch ?? [parsed]);
			return batch.map((entry) => entry?.event).filter((name) => typeof name === "string");
		}
	}
	return [];
}

function decodeBase64(text) {
	try {
		const bytes = Buffer.from(text, "base64");
		return bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes).toString("utf8") : bytes.toString("utf8");
	} catch {
		return undefined;
	}
}

function parseJson(text) {
	try {
		const value = JSON.parse(text);
		return typeof value === "object" && value !== null ? value : undefined;
	} catch {
		return undefined;
	}
}

// Runs in the page: touches each surface that should report.
async function drivePage() {
	const touched = [];

	location.hash = "#fail-fast";
	touched.push("rule anchor");

	const filter = document.querySelector("#rule-filter");
	filter.value = "retry";
	filter.dispatchEvent(new Event("input", { bubbles: true }));
	touched.push("rule filter");

	const consensusSearch = document.querySelector("#consensus-search");
	consensusSearch.value = "errors";
	consensusSearch.dispatchEvent(new Event("input", { bubbles: true }));
	touched.push("consensus filter");

	const searchForm = document.querySelector('form[data-tool="search-rules"]');
	searchForm.querySelector('input[name="query"]').value = "timeout";
	searchForm.requestSubmit();
	touched.push("search-rules tool");

	document.querySelector("#copy-markdown").click();
	touched.push("copy markdown");

	return touched;
}

let exitCode = 0;
try {
	const { targetId } = await send("Target.createTarget", { url: "about:blank" });
	const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
	await send("Page.enable", {}, sessionId);
	await send("Page.addScriptToEvaluateOnNewDocument", { source: RECORD_CAPTURES }, sessionId);
	// The copy button awaits the clipboard, and a denied prompt would stop it before it reports.
	await send("Browser.grantPermissions", { origin: new URL(url).origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });

	const loaded = waitForEvent("Page.loadEventFired");
	await send("Page.navigate", { url }, sessionId);
	await loaded;
	await wait(SETTLE_WAIT_MS);

	const driven = await send(
		"Runtime.evaluate",
		{ expression: `(${drivePage})()`, awaitPromise: true, returnByValue: true },
		sessionId
	);
	if (driven.exceptionDetails) throw new Error(`The page threw while being driven: ${driven.exceptionDetails.text}`);
	await wait(FLUSH_WAIT_MS);

	const captured = await send(
		"Runtime.evaluate",
		{ expression: "JSON.stringify(window.__captureBodies ?? [])", returnByValue: true },
		sessionId
	);
	const captureBodies = JSON.parse(captured.result.value);
	const seen = new Set(captureBodies.flatMap(eventNames));
	const missing = EXPECTED_EVENTS.filter((event) => !seen.has(event));

	console.log(`url:      ${url}`);
	console.log(`touched:  ${driven.result.value.join(", ")}`);
	console.log(`requests: ${captureBodies.length} to PostHog`);
	console.log(`events:   ${[...seen].sort().join(", ") || "none"}`);

	if (missing.length > 0) {
		console.error(`\nMissing: ${missing.join(", ")}`);
		exitCode = 1;
	} else {
		console.log("\nAll expected events left the page.");
	}
} catch (error) {
	console.error(error);
	exitCode = 1;
} finally {
	await cleanUp();
}

process.exit(exitCode);
