// Renders scripts/og/card.html to public/og.png, the 1200x630 image every share preview uses.
// Usage: node scripts/og/shoot.mjs
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const card = fileURLToPath(new URL("card.html", import.meta.url));
const out = fileURLToPath(new URL("../../public/og.png", import.meta.url));

const before = modifiedAt();

// Chrome writes the screenshot and then hangs on its own updater, so cap the wait and
// judge the run by the file rather than by the exit code.
try {
	execFileSync(CHROME, [
		"--headless=new",
		"--disable-gpu",
		"--hide-scrollbars",
		"--no-first-run",
		"--user-data-dir=/tmp/styleguidefyi-og",
		"--window-size=1200,630",
		// Fonts load over the network, so give the page time to swap them in before the shot.
		"--virtual-time-budget=4000",
		`--screenshot=${out}`,
		`file://${card}`,
	], { stdio: "ignore", timeout: 60_000 });
} catch {
	// Checked below.
}

const after = modifiedAt();
if (after === undefined || after === before) {
	throw new Error(`Chrome did not write ${out}. Check that it is installed at ${CHROME}.`);
}
console.log(`wrote ${out}`);

function modifiedAt() {
	try {
		return statSync(out).mtimeMs;
	} catch {
		return undefined;
	}
}
