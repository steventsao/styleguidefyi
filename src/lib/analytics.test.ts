import { afterEach, describe, expect, it, vi } from "vitest";
import { type Capturer, EVENTS, resetAnalytics, setCapturer, track } from "./analytics";

function fakeCapturer(): Capturer & { calls: [string, Record<string, unknown> | undefined][] } {
	const calls: [string, Record<string, unknown> | undefined][] = [];
	return { calls, capture: (event, properties) => calls.push([event, properties]) };
}

afterEach(() => {
	resetAnalytics();
	vi.restoreAllMocks();
});

describe("track", () => {
	it("sends the event to the attached capturer", () => {
		const capturer = fakeCapturer();
		setCapturer(capturer);

		track(EVENTS.guideCopied, { rules: 60 });

		expect(capturer.calls).toEqual([["guide_copied", { rules: 60 }]]);
	});

	it("delivers events captured before the client loaded", () => {
		track(EVENTS.ruleOpened, { rule: "fail-fast" });
		const capturer = fakeCapturer();

		setCapturer(capturer);

		expect(capturer.calls).toEqual([["rule_opened", { rule: "fail-fast" }]]);
	});

	it("flushes the queue once, not on every later event", () => {
		track(EVENTS.ruleOpened, { rule: "fail-fast" });
		const capturer = fakeCapturer();
		setCapturer(capturer);

		track(EVENTS.sectionOpened, { section: "errors" });

		expect(capturer.calls.map(([event]) => event)).toEqual(["rule_opened", "section_opened"]);
	});

	it("stops queueing so an unanswered page cannot grow without bound", () => {
		for (let index = 0; index < 200; index += 1) track(EVENTS.ruleOpened, { rule: `rule-${index}` });
		const capturer = fakeCapturer();

		setCapturer(capturer);

		expect(capturer.calls).toHaveLength(50);
	});

	it("truncates a long property so the capture is not rejected", () => {
		const capturer = fakeCapturer();
		setCapturer(capturer);

		track(EVENTS.webmcpToolCalled, { tool: "exec", command: "x".repeat(4096) });

		expect(capturer.calls[0][1]).toEqual({ tool: "exec", command: "x".repeat(300) });
	});

	it("reports a failed capture and lets the caller continue", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		setCapturer({
			capture: () => {
				throw new Error("network down");
			},
		});

		expect(() => track(EVENTS.guideCopied)).not.toThrow();
		expect(warn).toHaveBeenCalledOnce();
	});

	it("does nothing when no client is attached", () => {
		expect(() => track(EVENTS.guideCopied)).not.toThrow();
	});
});
