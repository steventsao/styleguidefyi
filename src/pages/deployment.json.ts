export function GET() {
	const revision = process.env.DEPLOY_COMMIT_SHA || null;
	if (revision !== null && !/^[a-f0-9]{40}$/.test(revision)) throw new Error("DEPLOY_COMMIT_SHA must be a full Git commit hash");
	return new Response(JSON.stringify({ revision, builtAt: new Date().toISOString() }) + "\n", {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
