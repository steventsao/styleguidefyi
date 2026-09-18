import { Bash, InMemoryFs, type IFileSystem } from "just-bash/browser";
import { styleguide } from "../data/styleguide";
import { guideFiles } from "./guide-files";
import { EXECUTION_TIMEOUT_MS, MAX_COMMAND_LENGTH, MAX_OUTPUT_BYTES, shellError, type ShellResult } from "./shell-protocol";

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
				maxCommandCount: 1000,
				maxLoopIterations: 1000,
				maxCallDepth: 30,
				maxStringLength: 1024 * 1024,
				maxLiveBytes: 8 * 1024 * 1024,
				maxInputBytes: 8 * 1024 * 1024,
			},
		});
		const { stdout, stderr, exitCode } = await bash.exec(command);
		// Some commands translate all filesystem errors to ENOENT. Preserve the actual cause.
		if (writeAttempted) return shellError("EROFS: guide filesystem is read-only");
		return { stdout, stderr, exitCode };
	} catch (error) {
		if (writeAttempted) return shellError("EROFS: guide filesystem is read-only");
		return shellError(error instanceof Error ? error.message : "Shell execution failed.");
	}
}
