import { capturePaths, readSnapshot, type Capture } from "../lib/mirrors";

export const getStaticPaths = capturePaths;

export function GET({ props }: { props: { capture: Capture } }) {
	return new Response(readSnapshot(props.capture.id, props.capture.sourceHash), {
		headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
	});
}
