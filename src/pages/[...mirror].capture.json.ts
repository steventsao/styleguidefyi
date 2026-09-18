import { captureMetadata, capturePaths, type Capture } from "../lib/mirrors";

export const getStaticPaths = capturePaths;

export function GET({ props }: { props: { capture: Capture } }) {
	return new Response(JSON.stringify(captureMetadata(props.capture), null, 2) + "\n", {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}
