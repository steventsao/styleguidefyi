import { runGuideShell } from "../lib/guide-shell";

self.onmessage = async (event: MessageEvent<{ command: string }>) => {
	self.postMessage(await runGuideShell(event.data.command));
};
