import { expect, test } from "vitest";
import execCases from "./fixtures/exec-cases.json";
import guideCases from "./fixtures/guide-tool-cases.json";
import { assertWebMcpReport, EXPECTED_TOOLS } from "./webmcp-results.mjs";

const cases = [...execCases, ...guideCases];

function validReport() {
	return {
		tools: [...EXPECTED_TOOLS],
		calls: cases.map(({ label, tool, input, expected }) => ({ label, tool, input, result: structuredClone(expected) })),
	};
}

test("accepts the complete expected results", () => {
	expect(() => assertWebMcpReport(validReport(), cases)).not.toThrow();
});

test.each([
	["extra stdout", (result) => { result.stdout += "unexpected output\n"; }],
	["truncated stdout", (result) => { result.stdout = "errors.md\n"; }],
	["missing newline", (result) => { result.stdout = result.stdout.trimEnd(); }],
	["unexpected stderr", (result) => { result.stderr = "warning\n"; }],
	["wrong exit code", (result) => { result.exitCode = 1; }],
	["extra result field", (result) => { result.env = { PWD: "/guide" }; }],
])("rejects %s instead of accepting a matching snippet", (_, mutate) => {
	const report = validReport();
	mutate(report.calls[0].result);
	expect(() => assertWebMcpReport(report, cases)).toThrow(/list virtual files/);
});

test.each(["missing", "extra", "duplicate", "wrong input", "rejected call", "wrong tool", "missing guide tool", "wrong called tool"])("rejects an invalid capture: %s", (mutation) => {
	const report = validReport();
	if (mutation === "missing") report.calls.pop();
	if (mutation === "extra") report.calls.push(report.calls[0]);
	if (mutation === "duplicate") report.calls[1] = report.calls[0];
	if (mutation === "wrong input") report.calls[0].input = { command: "echo fake" };
	if (mutation === "rejected call") {
		delete report.calls[0].result;
		Object.assign(report.calls[0], { error: "executeTool rejected" });
	}
	if (mutation === "wrong tool") report.tools.push("unexpected-tool");
	if (mutation === "missing guide tool") report.tools.shift();
	if (mutation === "wrong called tool") report.calls[0].tool = "get-styleguide";
	expect(() => assertWebMcpReport(report, cases)).toThrow();
});
