import { Bash, InMemoryFs, type IFileSystem } from "just-bash/browser";
import { styleguide } from "../data/styleguide";
import { guideFiles } from "./guide-files";
import { EXECUTION_TIMEOUT_MS, MAX_COMMAND_LENGTH, MAX_OUTPUT_BYTES, shellError, type ShellResult } from "./shell-protocol";

const MAX_COMMAND_COUNT = 1000;
const MAX_LOOP_ITERATIONS = 1000;
const MAX_CALL_DEPTH = 30;

// just-bash reports a bare limit and tells the caller to raise it, which an agent cannot do. Say what to do instead.
const RAISE_LIMIT_HINT = /, increase executionLimits\.\w+/g;
const OUTPUT_LIMIT = /output size (limit )?exceeded/;
const EXECUTION_LIMIT = /too many commands|too many iterations|maximum recursion depth|maximum nesting depth|execution deadline|execution timeout/;
const OUTPUT_LIMIT_GUIDANCE =
	`The ${MAX_OUTPUT_BYTES / 1024} KiB output limit counts the output of every command in a pipeline, not only the final output. ` +
	"Read one file per call, run grep, jq, sed or awk on the file directly instead of piping cat into them, or narrow the output with head or a more specific path.";
const EXECUTION_LIMIT_GUIDANCE =
	`Each call stops after ${MAX_COMMAND_COUNT} commands, ${MAX_LOOP_ITERATIONS} loop iterations, ${MAX_CALL_DEPTH} nested calls or ${EXECUTION_TIMEOUT_MS / 1000} seconds, and these limits cannot be raised. ` +
	"Loops are rarely needed: grep -r, find and jq work across files in one command. Otherwise split the work into smaller calls.";

function explainLimits(result: ShellResult): ShellResult {
	const guidance = OUTPUT_LIMIT.test(result.stderr) ? OUTPUT_LIMIT_GUIDANCE : EXECUTION_LIMIT.test(result.stderr) ? EXECUTION_LIMIT_GUIDANCE : null;
	if (!guidance) return result;
	// Partial output is dropped: an agent must not mistake it for the complete result.
	return { stdout: "", stderr: `${result.stderr.replace(RAISE_LIMIT_HINT, "").trimEnd()}\n${guidance}\n`, exitCode: 126 };
}

/** Reject mutations at the filesystem boundary, including redirects and sed -i. */
function readOnlyFilesystem(files: Record<string, string>, onWrite: () => void): IFileSystem {
	const fs = new InMemoryFs(files, { maxTotalBytes: 1024 * 1024 });
	const deny = async (): Promise<never> => {
		onWrite();
		throw new Error("EROFS: guide filesystem is read-only");
	};
	return {
		readFile: fs.readFile.bind(fs),
		readFileBytes: fs.readFileBytes.bind(fs),
		readFileBuffer: fs.readFileBuffer.bind(fs),
		exists: fs.exists.bind(fs),
		stat: fs.stat.bind(fs),
		lstat: fs.lstat.bind(fs),
		readdir: fs.readdir.bind(fs),
		readdirWithFileTypes: fs.readdirWithFileTypes.bind(fs),
		resolvePath: fs.resolvePath.bind(fs),
		getAllPaths: fs.getAllPaths.bind(fs),
		readlink: fs.readlink.bind(fs),
		realpath: fs.realpath.bind(fs),
		writeFile: deny,
		appendFile: deny,
		mkdir: deny,
		rm: deny,
		cp: deny,
		mv: deny,
		chmod: deny,
		symlink: deny,
		link: deny,
		utimes: deny,
	};
}

export async function runGuideShell(command: string): Promise<ShellResult> {
	if (typeof command !== "string" || !command.trim() || command.length > MAX_COMMAND_LENGTH) {
		return shellError(`Provide a non-empty command of at most ${MAX_COMMAND_LENGTH} characters.`, 2);
	}
	let writeAttempted = false;
	try {
		const bash = new Bash({
			fs: readOnlyFilesystem(guideFiles(styleguide), () => { writeAttempted = true; }),
			cwd: "/guide",
			commands: ["ls", "cat", "pwd", "find", "tree", "stat", "grep", "rg", "head", "tail", "wc", "sort", "uniq", "cut", "tr", "sed", "awk", "jq", "echo", "printf", "diff", "basename", "dirname", "help"],
			executionLimitProfile: "hardened",
			executionLimits: {
				maxSourceBytes: MAX_COMMAND_LENGTH * 4,
				maxExecutionTimeMs: EXECUTION_TIMEOUT_MS,
				maxOutputSize: MAX_OUTPUT_BYTES,
				maxCommandCount: MAX_COMMAND_COUNT,
				maxLoopIterations: MAX_LOOP_ITERATIONS,
				maxCallDepth: MAX_CALL_DEPTH,
				maxStringLength: 1024 * 1024,
				maxLiveBytes: 8 * 1024 * 1024,
				maxInputBytes: 8 * 1024 * 1024,
			},
		});
		const { stdout, stderr, exitCode } = await bash.exec(command);
		// Some commands translate all filesystem errors to ENOENT. Preserve the actual cause.
		if (writeAttempted) return shellError("EROFS: guide filesystem is read-only");
		return explainLimits({ stdout, stderr, exitCode });
	} catch (error) {
		if (writeAttempted) return shellError("EROFS: guide filesystem is read-only");
		return explainLimits(shellError(error instanceof Error ? error.message : "Shell execution failed."));
	}
}
