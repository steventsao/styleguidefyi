// Verify built/deployed assets over HTTP, including the exact release identity.
// Usage: node scripts/verify-site.mjs [url] [--commit <full-sha>]
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { parseArgs } from "node:util";
import { setTimeout } from "node:timers/promises";
import { load } from "cheerio";

const { values, positionals } = parseArgs({ options: { commit: { type: "string" } }, allowPositionals: true });
assert.ok(positionals.length <= 1, "Usage: node scripts/verify-site.mjs [url] [--commit <full-sha>]");
const base = new URL(positionals[0] ?? "https://styleguide.fyi");
assert.ok(base.protocol === "https:" || (base.protocol === "http:" && ["127.0.0.1", "localhost"].includes(base.hostname)), "Use HTTPS or local HTTP");
assert.ok(base.pathname === "/" && !base.search && !base.hash && !base.username && !base.password, "Supply a site origin without credentials, path, query or fragment");
if (values.commit) assert.match(values.commit, /^[a-f0-9]{40}$/, "Expected a full commit hash");
const captures = JSON.parse(await readFile(new URL("../content/mirrors/captures.json", import.meta.url)));
const sources = JSON.parse(await readFile(new URL("../content/mirrors/sources.json", import.meta.url)));
const pages = new Map();
const checksum = (value) => createHash("sha256").update(value).digest("hex");
let requests = 0;
async function get(path, status = 200) {
	const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30_000) });
	requests++;
	assert.equal(response.status, status, `${path}: HTTP status`);
	return response;
}

// Allow bounded edge propagation, but never accept a different release as success.
for (let attempt = 0; ; attempt++) {
	try {
		const response = await get("/deployment.json");
		assert.match(response.headers.get("cache-control"), /no-store/);
		const deployment = await response.json();
		if (values.commit) assert.equal(deployment.revision, values.commit, "Deployed commit does not match this release");
		assert.ok(Number.isFinite(Date.parse(deployment.builtAt)), "Missing build timestamp");
		break;
	} catch (error) {
		if (attempt >= 5) throw error;
		await setTimeout(5_000);
	}
}

for (const capture of captures) {
	for (const route of [capture.route, ...capture.aliases]) {
		const $ = load(await (await get(`/${route}`)).text());
		assert.equal($("link[rel=canonical]").attr("href"), `https://styleguide.fyi/${capture.route}`);
		assert.equal($("main h1").text(), capture.title);
		pages.set(`/${route}`, $);
		const raw = await get(`/${route}.source.txt`);
		assert.match(raw.headers.get("content-type"), /text\/plain; charset=utf-8/);
		assert.equal(raw.headers.get("x-content-type-options"), "nosniff");
		assert.match(raw.headers.get("content-security-policy"), /sandbox/);
		assert.equal(raw.headers.get("access-control-allow-origin"), "*");
		assert.equal(checksum(await raw.text()), capture.sourceHash, `${route}: source checksum`);
		const metadataResponse = await get(`/${route}.capture.json`);
		assert.equal(metadataResponse.headers.get("access-control-allow-origin"), "*");
		const metadata = await metadataResponse.json();
		assert.equal(metadata.sourceHash, capture.sourceHash);
		assert.equal(metadata.mirrorUrl, `https://styleguide.fyi/${capture.route}`);
	}
}
for (const collection of sources.collections) {
	if (!pages.has(`/${collection.id}`)) pages.set(`/${collection.id}`, load(await (await get(`/${collection.id}`)).text()));
}
const licenses = [...new Map(captures.map((capture) => [capture.license.id, capture.license])).values()];
for (const license of licenses) {
	const response = await get(`/licenses/mirrors/${license.id}.txt`);
	assert.equal(checksum(await response.text()), license.sha256, `${license.id}: license checksum`);
}
for (const [route, $] of pages) {
	for (const element of $("a[href]").toArray()) {
		const href = $(element).attr("href");
		if (!href.startsWith("/") && !href.startsWith("#")) continue;
		const url = new URL(href, new URL(route, base));
		const target = pages.get(url.pathname);
		if (target && url.hash) {
			const id = decodeURIComponent(url.hash.slice(1));
			assert.ok(target("[id]").toArray().some((node) => target(node).attr("id") === id), `${route} -> ${href}`);
		}
	}
}
const home = load(await (await get("/")).text());
assert.equal(home("#rules").length, 1);
assert.equal(home('a[href="/library"]').length > 0, true);
assert.equal(load(await (await get("/library")).text())("main h1").text(), "Captured style guides.");
// Compare guide/catalog data with this build, not merely HTTP 200 or a matching title.
for (const path of ["styleguide.md", "consensus.json", "references.md", "references.json", "mirrors.json"]) {
	const local = await readFile(new URL(`../dist/${path}`, import.meta.url));
	assert.equal(checksum(await (await get(`/${path}`)).text()), checksum(local), `${path}: built content checksum`);
}
await get("/missing-org/missing-repo", 404);
console.log(JSON.stringify({ origin: base.origin, revision: values.commit ?? "not asserted", requests, captures: captures.length, readersAndCollections: pages.size, licenses: licenses.length, result: "passed" }, null, 2));
