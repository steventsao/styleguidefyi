import { captures, readSnapshot } from "../../../lib/mirrors";

export function getStaticPaths() {
	return [...new Map(captures.map((capture) => [capture.license.id, capture.license])).values()]
		.map((license) => ({ params: { license: license.id }, props: { license } }));
}

export function GET({ props }: { props: { license: { id: string; sha256: string } } }) {
	return new Response(readSnapshot(props.license.id, props.license.sha256), {
		headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
	});
}
