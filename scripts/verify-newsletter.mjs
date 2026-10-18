// Integration check: reserved test address, isolated preview/local DB, token cleanup.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const [origin, permission] = process.argv.slice(2);
assert.equal(permission, "--allow-write", "Pass a local or preview origin and --allow-write; this creates and removes a test signup.");
const base = new URL(origin);
assert.ok(base.origin === origin && !base.username && !base.password);
assert.ok(["127.0.0.1", "localhost", "styleguidefyi-shell.steventsao.workers.dev"].includes(base.hostname), "Writes are restricted to local/preview, never production.");
async function post(path, body, expectedStatus) {
	const response = await fetch(new URL(path, base), { method: "POST", headers: { Origin: base.origin, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body), signal: AbortSignal.timeout(15_000) });
	assert.equal(response.status, expectedStatus, `${path}: status`);
	assert.equal(response.headers.get("cache-control"), "no-store");
	return response.json();
}
await post("/api/newsletter", { email: "invalid", consent: "yes" }, 400);
await post("/api/newsletter", { email: "not-saved@example.invalid" }, 400);
const email = `newsletter-check-${randomUUID()}@example.invalid`;
const first = await post("/api/newsletter", { email, consent: "yes" }, 200);
assert.match(first.unsubscribeUrl, /^\/newsletter\/unsubscribe#[a-f0-9]{64}$/);
try {
	const duplicate = await post("/api/newsletter", { email, consent: "yes" }, 200);
	assert.equal(duplicate.message, first.message);
	assert.equal(duplicate.unsubscribeUrl, undefined, "A duplicate cannot disclose or rotate the private link");
} finally {
	await post("/api/newsletter/unsubscribe", { token: first.unsubscribeUrl.split("#")[1] }, 200);
}
console.log("Newsletter integration passed: validation, consent, signup, duplicate, and private-link removal.");
