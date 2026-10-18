import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker, { tokenHash, type Env } from "./worker";

let db: DatabaseSync;
let env: Env;
const request = (body = "email=Reader%40example.com&consent=yes", path = "/api/newsletter", headers: Record<string, string> = {}) => new Request(`https://styleguide.fyi${path}`, { method: "POST", headers: { Origin: "https://styleguide.fyi", "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...headers }, body });

beforeEach(() => {
	db = new DatabaseSync(":memory:");
	db.exec(readFileSync(new URL("../../migrations/0001_newsletter.sql", import.meta.url), "utf8"));
	env = {
		ASSETS: { fetch: vi.fn(async () => new Response("Static page")) },
		NEWSLETTER_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
		NEWSLETTER_DB: { prepare: (query) => {
			let values: (string | number | null)[] = [];
			const statement = { bind: (...args: (string | number | null)[]) => { values = args; return statement; }, run: async () => ({ meta: { changes: Number(db.prepare(query).run(...values).changes) } }) };
			return statement;
		} },
	};
});
afterEach(() => db.close());

describe("newsletter public boundary", () => {
	it("saves consent as an unverified signup and permits removal only with the private capability", async () => {
		const response = await worker.fetch(request(), env);
		expect(response.status).toBe(200);
		const result = await response.json();
		const token = result.unsubscribeUrl.split("#")[1];
		expect(token).toMatch(/^[a-f0-9]{64}$/);
		const row = db.prepare("SELECT * FROM newsletter_signups").get();
		expect(row).toMatchObject({ email: "reader@example.com", status: "pending", confirmed_at: null, consent_version: "newsletter-launch-2026-10-17", unsubscribe_hash: await tokenHash(token) });
		expect(JSON.stringify(row)).not.toContain(token);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		await worker.fetch(request(`token=${"a".repeat(64)}`, "/api/newsletter/unsubscribe"), env);
		expect(db.prepare("SELECT count(*) AS count FROM newsletter_signups").get()?.count).toBe(1);
		await worker.fetch(request(`token=${token}`, "/api/newsletter/unsubscribe"), env);
		expect(db.prepare("SELECT count(*) AS count FROM newsletter_signups").get()?.count).toBe(0);
	});
	it("deduplicates normalized addresses without rotating or returning the existing private token", async () => {
		const first = await (await worker.fetch(request(), env)).json();
		const originalHash = db.prepare("SELECT unsubscribe_hash FROM newsletter_signups").get()?.unsubscribe_hash;
		const second = await (await worker.fetch(request("email=%20reader%40example.com%20&consent=yes"), env)).json();
		expect(first.message).toBe(second.message);
		expect(first.unsubscribeUrl).toMatch(/#[a-f0-9]{64}$/);
		expect(second).not.toHaveProperty("unsubscribeUrl");
		expect(db.prepare("SELECT unsubscribe_hash FROM newsletter_signups").all()).toEqual([{ unsubscribe_hash: originalHash }]);
	});
	it.each([
		["email=nope&consent=yes", 400],
		["email=a%40example.com", 400],
		["email=a%40example.com&consent=yes&website=spam", 400],
		["x".repeat(4097), 413],
	])("rejects invalid input without saving it", async (body, status) => {
		expect((await worker.fetch(request(body as string), env)).status).toBe(status);
		expect(db.prepare("SELECT count(*) AS count FROM newsletter_signups").get()?.count).toBe(0);
	});
	it("enforces method, origin, content type, rate limit, and binding availability", async () => {
		expect((await worker.fetch(new Request("https://styleguide.fyi/api/newsletter"), env)).status).toBe(405);
		expect((await worker.fetch(request(undefined, undefined, { Origin: "https://other.example" }), env)).status).toBe(403);
		expect((await worker.fetch(request(undefined, undefined, { "Content-Type": "application/json" }), env)).status).toBe(415);
		env.NEWSLETTER_LIMITER = { limit: async () => ({ success: false }) };
		const limited = await worker.fetch(request(), env);
		expect(limited.status).toBe(429);
		expect(limited.headers.get("Retry-After")).toBe("60");
		delete env.NEWSLETTER_DB;
		expect((await worker.fetch(request(), env)).status).toBe(503);
	});
	it("returns a useful failure without leaking database details or pretending success", async () => {
		env.NEWSLETTER_DB!.prepare = () => { throw new Error("sensitive query details"); };
		const response = await worker.fetch(request(), env);
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain("sensitive");
	});
	it("provides an HTML confirmation for a native form and never reflects the email", async () => {
		const response = await worker.fetch(request(undefined, undefined, { Accept: "text/html" }), env);
		expect(response.headers.get("Content-Type")).toContain("text/html");
		const html = await response.text();
		expect(html).toContain("private unsubscribe link");
		expect(html).not.toContain("Reader");
	});
	it("preserves static responses and prevents preview indexing", async () => {
		const response = await worker.fetch(new Request("https://preview.example/blog"), { ...env, PREVIEW: "true" });
		expect(await response.text()).toBe("Static page");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
	});
});
