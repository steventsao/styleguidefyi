import { expect, test } from "vitest";
import cases from "./fixtures/exec-cases.json";
import { assertWebMcpReport } from "./webmcp-results.mjs";

function validReport() {
	return {
		tools: ["exec"],
		calls: cases.map(({ label, input, expected }) => ({ label, input, result: structuredClone(expected) })),
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

test.each(["missing", "extra", "duplicate", "wrong input", "rejected call", "wrong tool"])("rejects an invalid capture: %s", (mutation) => {
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
	expect(() => assertWebMcpReport(report, cases)).toThrow();
});
