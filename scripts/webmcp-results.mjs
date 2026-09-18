import assert from "node:assert/strict";

/** Compare complete captured calls; fixtures are reviewed, never regenerated here. */
export function assertWebMcpReport(report, cases) {
	assert.deepStrictEqual(report.tools, ["exec"], "Expected exactly one exec tool");
	assert.equal(report.calls.length, cases.length, "Expected every exec case exactly once");
	for (const [index, { label, input, expected }] of cases.entries()) {
		assert.deepStrictEqual(report.calls[index], { label, input, result: expected }, label);
	}
}
