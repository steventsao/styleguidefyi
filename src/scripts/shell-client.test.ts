import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { WORKER_TIMEOUT_MS } from "../lib/shell-protocol";
import { runShell } from "./shell-client";

class TestWorker {
	static instances: TestWorker[] = [];
	onmessage: (event: { data: unknown }) => void;
	onerror: (event: { preventDefault(): void }) => void;
	onmessageerror: () => void;
	postMessage = vi.fn();
	terminate = vi.fn();
	constructor() { TestWorker.instances.push(this); }
}

beforeEach(() => {
	vi.useFakeTimers();
	TestWorker.instances = [];
	vi.stubGlobal("Worker", TestWorker);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

test("kills an unresponsive worker and allows the next call", async () => {
	const pending = runShell("while :; do :; done");
	await vi.advanceTimersByTimeAsync(WORKER_TIMEOUT_MS);
	expect((await pending).exitCode).toBe(124);
	expect(TestWorker.instances[0].terminate).toHaveBeenCalledOnce();
	const next = runShell("pwd");
	const worker = TestWorker.instances[1];
	worker.onmessage({ data: { stdout: "/guide\n", stderr: "", exitCode: 0 } });
	expect((await next).stdout).toBe("/guide\n");
	expect(worker.terminate).toHaveBeenCalledOnce();
	expect(vi.getTimerCount()).toBe(0);
});

test("rejects concurrent work without creating another worker", async () => {
	const first = runShell("ls");
	expect((await runShell("cat styleguide.md")).exitCode).toBe(75);
	expect(TestWorker.instances).toHaveLength(1);
	TestWorker.instances[0].onmessage({ data: { stdout: "files\n", stderr: "", exitCode: 0 } });
	await first;
});

test("turns worker loading errors into a result and releases its resources", async () => {
	const pending = runShell("ls");
	const worker = TestWorker.instances[0];
	worker.onerror({ preventDefault: vi.fn() });
	expect((await pending).exitCode).toBe(1);
	expect(worker.terminate).toHaveBeenCalledOnce();
	expect(vi.getTimerCount()).toBe(0);
});
