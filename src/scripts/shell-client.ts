import { shellError, WORKER_TIMEOUT_MS, type ShellResult } from "../lib/shell-protocol";

let running = false;

/** Start the shell bundle only on demand; terminate the worker after every call. */
export async function runShell(command: string): Promise<ShellResult> {
	if (running) return shellError("A command is already running. Retry when it finishes.", 75);
	running = true;
	try {
		return await new Promise<ShellResult>((resolve) => {
			const worker = new Worker(new URL("./shell.worker.ts", import.meta.url), { type: "module" });
			const finish = (result: ShellResult) => {
				clearTimeout(timer);
				worker.terminate();
				resolve(result);
			};
			// This timer runs on the page, so a blocked interpreter can still be stopped.
			const timer = setTimeout(() => finish(shellError("Shell worker timed out. Try a smaller query.", 124)), WORKER_TIMEOUT_MS);
			worker.onmessage = (event: MessageEvent<ShellResult>) => finish(event.data);
			worker.onerror = (event) => {
				event.preventDefault();
				finish(shellError("The shell worker could not run. Reload the page and retry."));
			};
			worker.onmessageerror = () => finish(shellError("The shell worker returned an unreadable result."));
			try {
				worker.postMessage({ command });
			} catch {
				finish(shellError("The command could not be sent to the shell worker."));
			}
		});
	} catch {
		return shellError("The browser could not start the shell worker. Reload the page and retry.");
	} finally {
		running = false;
	}
}
