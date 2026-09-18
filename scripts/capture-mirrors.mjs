import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { load } from "cheerio";

const root = fileURLToPath(new URL("../content/mirrors/", import.meta.url));
const config = JSON.parse(await readFile(join(root, "sources.json"), "utf8"));
const args = process.argv.slice(2);
const selectedId = args[0] === "--repo" && args.length === 2 ? args[1] : null;
if (!(args.length === 1 && args[0] === "--all") && !selectedId) {
	throw new Error("Usage: node scripts/capture-mirrors.mjs --all | --repo google/styleguide");
}
const collections = config.collections.filter((entry) => !selectedId || entry.id === selectedId);
if (!collections.length) throw new Error(`No configured public collection: ${selectedId}`);

const hash = (value) => createHash("sha256").update(value).digest("hex");
const safeSegment = /^[a-z0-9][a-z0-9-]*$/;
const safeRepo = /^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9.-]*$/;
const allowedHosts = new Set(["api.github.com", "raw.githubusercontent.com", "peps.python.org", "go.dev"]);
const MAX_BYTES = 2 * 1024 * 1024;

async function download(url) {
	const parsed = new URL(url);
	if (parsed.protocol !== "https:" || parsed.username || parsed.password || !allowedHosts.has(parsed.hostname)) {
		throw new Error(`Unapproved public capture origin: ${parsed.origin}`);
	}
	// Deliberately unauthenticated: never use local GitHub credentials to capture content.
	const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
	if (!response.ok) throw new Error(`Capture returned HTTP ${response.status}: ${url}`);
	const chunks = [];
	let size = 0;
	for await (const chunk of response.body) {
		size += chunk.length;
		if (size > MAX_BYTES) throw new Error(`Capture exceeds ${MAX_BYTES} bytes: ${url}`);
		chunks.push(chunk);
	}
	const text = Buffer.concat(chunks).toString("utf8");
	if (!text.trim()) throw new Error(`Empty capture: ${url}`);
	return text;
}

async function saveText(id, text) {
	if (!safeSegment.test(id)) throw new Error(`Invalid capture id: ${id}`);
	const sha256 = hash(text);
	const directory = join(root, "snapshots", id);
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, `${sha256}.txt`), text, "utf8");
	return sha256;
}

const previous = await readFile(join(root, "captures.json"), "utf8")
	.then(JSON.parse).catch((error) => { if (error.code === "ENOENT") return []; throw error; });
const replacements = [];
for (const collection of collections) {
	if (!safeRepo.test(collection.id)) throw new Error(`Invalid repository: ${collection.id}`);
	const repo = JSON.parse(await download(`https://api.github.com/repos/${collection.id}`));
	if (repo.private !== false || repo.visibility !== "public") throw new Error(`Only public repositories can be captured: ${collection.id}`);
	const commit = JSON.parse(await download(`https://api.github.com/repos/${collection.id}/commits/${encodeURIComponent(repo.default_branch)}`));
	if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error("GitHub did not return a full commit hash");
	const rawUrl = (path) => {
		if (path.split("/").some((part) => part === ".." || !part) || path.includes("\\")) throw new Error("Invalid upstream path");
		return `https://raw.githubusercontent.com/${collection.id}/${commit.sha}/${path.split("/").map(encodeURIComponent).join("/")}`;
	};
	const licenseUrl = rawUrl(collection.license.path);
	const originalLicense = await download(licenseUrl);
	if (!originalLicense.includes(collection.license.contains)) throw new Error(`License evidence changed: ${collection.id}`);
	const licenseText = collection.license.notice ? `${collection.license.notice}\n\nSource: ${licenseUrl}\n` : originalLicense;
	const licenseId = `${collection.id.replace("/", "-")}-license`;
	const licenseHash = await saveText(licenseId, licenseText);
	for (const doc of collection.documents) {
		const sourceUrl = doc.capture === "web" ? doc.url : rawUrl(doc.path);
		const source = await download(sourceUrl);
		if (doc.format === "html") {
			const $ = load(source);
			if (!doc.selector || $(doc.selector).length !== 1 || $(doc.selector).text().trim().length < 100) {
				throw new Error(`Expected exactly one readable article at ${doc.selector}: ${sourceUrl}`);
			}
		}
		const route = `${collection.id}${doc.slug ? `/${doc.slug}` : ""}`;
		if (!route.split("/").every((part) => /^[a-z0-9][a-z0-9.-]*$/.test(part) && part !== "..")) throw new Error("Invalid mirror route");
		const sourceHash = await saveText(doc.id, source);
		replacements.push({
			id: doc.id, repository: collection.id, collectionTitle: collection.title,
			route, aliases: doc.aliases ?? [], title: doc.title, author: collection.author,
			catalogId: doc.catalogId ?? null, format: doc.format, selector: doc.selector ?? null,
			upstreamUrl: doc.url, sourcePath: doc.path, sourceUrl,
			revision: doc.capture === "web" ? null : commit.sha,
			capturedAt: new Date().toISOString(), sourceHash,
			license: { label: collection.license.label, url: collection.license.url, sourceUrl: licenseUrl, id: licenseId, sha256: licenseHash },
		});
		console.log(`Captured /${route} (${Buffer.byteLength(source)} bytes)`);
	}
}

const selectedRepos = new Set(collections.map((collection) => collection.id));
const next = [...previous.filter((entry) => !selectedRepos.has(entry.repository)), ...replacements].sort((a, b) => a.route.localeCompare(b.route));
const paths = new Set();
for (const entry of next) {
	for (const path of [entry.route, ...entry.aliases]) {
		if (paths.has(path)) throw new Error(`Duplicate mirror route: ${path}`);
		paths.add(path);
	}
}
// Publish the manifest only after the entire requested capture has succeeded.
const temp = resolve(root, "captures.json.tmp");
await writeFile(temp, JSON.stringify(next, null, 2) + "\n");
await rename(temp, join(root, "captures.json"));
console.log(`Saved ${next.length} public snapshots. Review the diff before publishing.`);
