import { describe, expect, test, vi } from "vitest";
import { styleguide } from "../data/styleguide";
import { guideFiles } from "./guide-files";
import { runGuideShell } from "./guide-shell";
import { MAX_COMMAND_LENGTH, MAX_OUTPUT_BYTES } from "./shell-protocol";
import { countRules, styleguideToMarkdown } from "./styleguide";
import { createShellTool } from "./webmcp-tools";

describe("guide shell", () => {
	test("every index path resolves to the published guide content", () => {
		const files = guideFiles(styleguide);
		expect(files["/guide/styleguide.md"]).toBe(styleguideToMarkdown(styleguide));
		const index = JSON.parse(files["/guide/index.json"]) as {
			sections: Array<{ title: string; path: string; rules: Array<{ path: string; url: string }> }>;
		};
		expect(index.sections.flatMap((section) => section.rules)).toHaveLength(countRules(styleguide));
		for (const section of index.sections) {
			expect(files[section.path]).toContain(section.title);
			for (const rule of section.rules) expect(files[rule.path]).toContain(rule.url);
		}
		expect(Object.keys(files).every((path) => path.startsWith("/guide/"))).toBe(true);
	});

	test("lists, reads, searches with pipes, and queries JSON", async () => {
		expect(await runGuideShell("ls /guide")).toMatchObject({ exitCode: 0, stderr: "" });
		const whole = await runGuideShell("cat styleguide.md");
		expect(whole).toEqual({ stdout: styleguideToMarkdown(styleguide), stderr: "", exitCode: 0 });
		const search = await runGuideShell("grep -l 'permission' rules/*.md | sort");
		expect(search.exitCode).toBe(0);
		expect(search.stdout).toContain("rules/parse-at-the-boundary.md");
		const count = await runGuideShell("jq '[.sections[].rules[]] | length' index.json");
		expect(count.stdout.trim()).toBe(String(countRules(styleguide)));
		expect(count.exitCode).toBe(0);
	});

	test.each([
		"echo replaced > rules/never-swallow.md",
		"echo appended >> rules/never-swallow.md",
		"sed -i 's/Never/Always/g' rules/never-swallow.md",
		"echo new > /tmp/new-file",
		"awk 'BEGIN { print 1 > \"/guide/new-file\" }'",
	])("rejects filesystem mutation: %s", async (command) => {
		const result = await runGuideShell(command);
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("read-only");
		const after = await runGuideShell("head -1 rules/never-swallow.md");
		expect(after.stdout).toBe("### Never swallow an error.\n");
	});

	test.each(["curl https://example.com", "node -e '1'", "python3 -c '1'", "rm rules/never-swallow.md"])("does not expose external or write commands: %s", async (command) => {
		expect((await runGuideShell(command)).exitCode).toBe(127);
	});

	test("cannot read host files and starts each call in /guide", async () => {
		expect((await runGuideShell("cat /etc/passwd")).exitCode).not.toBe(0);
		expect((await runGuideShell("cd sections; pwd")).stdout).toBe("/guide/sections\n");
		expect((await runGuideShell("pwd")).stdout).toBe("/guide\n");
	});

	test("bounds loops and output, then accepts another command", async () => {
		const loop = await runGuideShell("while :; do :; done");
		expect(loop.exitCode).not.toBe(0);
		expect(loop.stderr).toMatch(/limit|iterations/i);
		const output = await runGuideShell("printf '%100000s' x");
		expect(output.exitCode).not.toBe(0);
		expect(new TextEncoder().encode(output.stdout + output.stderr).length).toBeLessThanOrEqual(MAX_OUTPUT_BYTES);
		expect((await runGuideShell("echo ready")).stdout).toBe("ready\n");
	});
});

describe("exec WebMCP tool", () => {
	test("returns only a serializable shell result", async () => {
		const tool = createShellTool(runGuideShell);
		expect(tool.name).toBe("exec");
		expect(tool.annotations.readOnlyHint).toBe(true);
		const result = await tool.execute({ command: "ls /guide" });
		expect(Object.keys(result).sort()).toEqual(["exitCode", "stderr", "stdout"]);
		expect(JSON.parse(JSON.stringify(result))).toEqual(result);
	});

	test.each([{}, { command: " " }, { command: 1 }, { command: "x".repeat(MAX_COMMAND_LENGTH + 1) }])("rejects invalid arguments without starting a worker", async (input) => {
		const run = vi.fn();
		const result = await createShellTool(run).execute(input);
		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain("command");
		expect(run).not.toHaveBeenCalled();
	});

	test("returns execution failures as values instead of rejected promises", async () => {
		const run = vi.fn().mockRejectedValue(new Error("internal details"));
		const result = await createShellTool(run).execute({ command: "ls" });
		expect(result.exitCode).toBe(1);
		expect(result.stderr).not.toContain("internal details");
	});
});
