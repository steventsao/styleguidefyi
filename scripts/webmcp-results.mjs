import assert from "node:assert/strict";

export const EXPECTED_TOOLS = ["list-sections", "get-section", "search-rules", "get-styleguide", "exec"];

/** Compare complete captured calls; fixtures are reviewed, never regenerated here. */
export function assertWebMcpReport(report, cases) {
	assert.deepStrictEqual(report.tools.toSorted(), EXPECTED_TOOLS.toSorted(), "Expected the four guide tools plus exec");
	assert.equal(report.calls.length, cases.length, "Expected every tool case exactly once");
	for (const [index, { label, tool, input, expected }] of cases.entries()) {
		assert.deepStrictEqual(report.calls[index], { label, tool, input, result: expected }, label);
	}
}
