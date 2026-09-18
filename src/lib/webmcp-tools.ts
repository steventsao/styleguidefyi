import { MAX_COMMAND_LENGTH, shellError, type ShellRunner } from "./shell-protocol";

/** Shared by the page's Run form and the single WebMCP tool. */
export const shellToolMetadata = {
	name: "exec",
	title: "Explore the guide with a shell",
	description:
		"Run Bash commands over a read-only, in-memory copy of this coding style guide. " +
		"Each call starts at /guide. Start with `ls /guide` or `cat /guide/README.md`. " +
		"Read the whole guide at /guide/styleguide.md, sections at /guide/sections/<id>.md, " +
		"individual rules at /guide/rules/<id>.md, and paths/titles/URLs in /guide/index.json. " +
		"Use ls, cat, find, tree, grep, rg, head, tail, wc, sort, uniq, cut, tr, sed, awk, jq and pipes. " +
		"No writes, network or external programs. No state persists between calls. " +
		"Returns {stdout, stderr, exitCode}; a nonzero exitCode indicates a command error. " +
		"Commands are limited to 4096 characters, execution to 3 seconds and output to 64 KiB. " +
		"Narrow large queries with head or more specific paths.",
	inputSchema: {
		type: "object",
		properties: {
			command: { type: "string", minLength: 1, maxLength: MAX_COMMAND_LENGTH, description: "Bash command, for example: cat sections/errors.md | head -30" },
		},
		required: ["command"],
		additionalProperties: false,
	},
	annotations: { readOnlyHint: true },
};

export function createShellTool(runShell: ShellRunner) {
	return {
		...shellToolMetadata,
		execute: async (input: Record<string, unknown>) => {
			if (!input || typeof input.command !== "string" || !input.command.trim() || input.command.length > MAX_COMMAND_LENGTH) {
				return shellError(`Provide a non-empty "command" of at most ${MAX_COMMAND_LENGTH} characters, for example "ls /guide".`, 2);
			}
			try {
				return await runShell(input.command);
			} catch {
				// WebMCP drops rejected promise reasons; return a correctable result instead.
				return shellError("Shell execution failed. Try a smaller command.");
			}
		},
	};
}

export type WebMcpTool = ReturnType<typeof createShellTool>;
