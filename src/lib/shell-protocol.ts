export interface ShellResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export type ShellRunner = (command: string) => Promise<ShellResult>;

export const MAX_COMMAND_LENGTH = 4096;
export const MAX_OUTPUT_BYTES = 64 * 1024;
export const EXECUTION_TIMEOUT_MS = 3000;
export const WORKER_TIMEOUT_MS = 10000;

export function shellError(message: string, exitCode = 1): ShellResult {
	return { stdout: "", stderr: message + "\n", exitCode };
}
