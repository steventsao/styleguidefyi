import { z } from "zod";

interface Statement {
	bind(...values: (string | number | null)[]): Statement;
	run(): Promise<{ meta: { changes: number } }>;
}
export interface Env {
	ASSETS: { fetch(request: Request): Promise<Response> };
	NEWSLETTER_DB?: { prepare(query: string): Statement };
	NEWSLETTER_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
	PREVIEW?: string;
}

const MAX_BODY_BYTES = 4096;
const CONSENT_VERSION = "newsletter-launch-2026-10-17";
const emailSchema = z.email().max(254);
const SUCCESS = "Thanks for joining the launch list. Email delivery hasn’t launched yet. If you signed up before, keep your original unsubscribe link.";
const responseHeaders = {
	"Cache-Control": "no-store",
	"X-Content-Type-Options": "nosniff",
	"X-Robots-Tag": "noindex, nofollow",
	"Referrer-Policy": "no-referrer",
};

function escapeHtml(text: string) {
	return text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function reply(request: Request, status: number, payload: { message?: string; error?: string; unsubscribeUrl?: string }) {
	const headers = new Headers(responseHeaders);
	if (status === 429) headers.set("Retry-After", "60");
	if (status === 405) headers.set("Allow", "POST");
	if (request.headers.get("Accept")?.includes("application/json")) {
		headers.set("Content-Type", "application/json; charset=utf-8");
		return new Response(JSON.stringify(payload), { status, headers });
	}
	// Native form submission works without JavaScript; never echo submitted data.
	headers.set("Content-Type", "text/html; charset=utf-8");
	headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
	return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Newsletter — styleguide.fyi</title><style>body{max-width:40rem;margin:12vh auto;padding:24px;font:18px/1.6 system-ui;background:#fbfaf7;color:#1c1b19}a{color:#a63509}h1{font-size:2rem;line-height:1.2}a:focus-visible{outline:2px solid currentColor;outline-offset:4px}</style></head><body><main><h1>${status < 400 ? "Newsletter request saved." : "We couldn’t save that request."}</h1><p>${escapeHtml(payload.message ?? payload.error ?? "Please try again.")}</p>${payload.unsubscribeUrl ? `<p><a href="${escapeHtml(payload.unsubscribeUrl)}" rel="noreferrer">Save your private unsubscribe link</a></p>` : ""}<p><a href="/newsletter">Back to the newsletter</a> · <a href="/blog">Read the blog</a></p></main></body></html>`, { status, headers });
}

async function limitedBody(request: Request): Promise<string | null> {
	if (Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES) return null;
	if (!request.body) return "";
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_BODY_BYTES) { await reader.cancel(); return null; }
			chunks.push(value);
		}
	} finally { reader.releaseLock(); }
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
	return new TextDecoder().decode(bytes);
}

export async function tokenHash(token: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function newsletter(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const isUnsubscribe = url.pathname === "/api/newsletter/unsubscribe";
	if (!["/api/newsletter", "/api/newsletter/unsubscribe"].includes(url.pathname)) return reply(request, 404, { error: "Unknown newsletter endpoint." });
	if (request.method !== "POST") return reply(request, 405, { error: "Use the newsletter form to submit a request." });
	if (request.headers.get("Origin") !== url.origin) return reply(request, 403, { error: "Submit the form from this website." });
	if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/x-www-form-urlencoded") return reply(request, 415, { error: "Use the newsletter form to submit a request." });
	if (!env.NEWSLETTER_DB || !env.NEWSLETTER_LIMITER) return reply(request, 503, { error: "Signups are temporarily unavailable. Please try again later or follow the RSS feed." });
	try {
		// Anonymous form: use Cloudflare's trusted client header, never a forwarded IP.
		// Counters live in the limiter, not in the subscriber database.
		const { success } = await env.NEWSLETTER_LIMITER.limit({ key: `newsletter:${request.headers.get("CF-Connecting-IP") ?? "local"}` });
		if (!success) return reply(request, 429, { error: "Too many requests. Please wait a minute and try again." });
		const body = await limitedBody(request);
		if (body === null) return reply(request, 413, { error: "That request is too large. Please use the signup form." });
		const fields = new URLSearchParams(body);
		if (isUnsubscribe) {
			const token = fields.get("token") ?? "";
			if (!/^[a-f0-9]{64}$/.test(token)) return reply(request, 400, { error: "Open the complete private unsubscribe link you saved when signing up." });
			await env.NEWSLETTER_DB.prepare("DELETE FROM newsletter_signups WHERE unsubscribe_hash = ?").bind(await tokenHash(token)).run();
			return reply(request, 200, { message: "Any signup associated with this link has been removed. If you signed up more than once, use the link from your first signup." });
		}
		if (fields.get("website")) return reply(request, 400, { error: "Please leave the website field empty and try again." });
		const email = (fields.get("email") ?? "").trim().toLowerCase();
		if (!emailSchema.safeParse(email).success) return reply(request, 400, { error: "Enter a valid email address, such as you@example.com." });
		if (fields.get("consent") !== "yes") return reply(request, 400, { error: "Check the email consent box to join the list." });
		const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
		const saved = await env.NEWSLETTER_DB.prepare("INSERT INTO newsletter_signups (email, created_at, consent_version, unsubscribe_hash) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING")
			.bind(email, new Date().toISOString(), CONSENT_VERSION, await tokenHash(token)).run();
		// Only the first signup receives a working capability. Never disclose or rotate
		// an existing subscriber's private link in response to an unauthenticated form.
		return reply(request, 200, { message: SUCCESS, ...(saved.meta.changes > 0 ? { unsubscribeUrl: `/newsletter/unsubscribe#${token}` } : {}) });
	} catch {
		// Do not log a query exception: database messages can contain submitted emails.
		return reply(request, 503, { error: "We couldn’t save your request. Please try again later." });
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const pathname = new URL(request.url).pathname;
		if (pathname.startsWith("/api/")) return newsletter(request, env);
		const response = await env.ASSETS.fetch(request);
		if (env.PREVIEW !== "true") return response;
		const preview = new Response(response.body, response);
		preview.headers.set("X-Robots-Tag", "noindex, nofollow");
		return preview;
	},
};
