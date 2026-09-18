// just-bash 3.4.2's browser entry still statically imports node:zlib for gzip and rg -z.
// Our guide contains plain text and compression commands are not registered.
export const constants = { Z_BEST_COMPRESSION: 9, Z_BEST_SPEED: 1, Z_DEFAULT_COMPRESSION: -1 };

export function gunzipSync(): never {
	throw new Error("Compressed files are not supported in this guide shell.");
}

export function gzipSync(): never {
	throw new Error("Compression is not supported in this guide shell.");
}
