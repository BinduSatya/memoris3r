/**
 * Produce a short, safe-to-surface description of a server-side S3 error.
 *
 * AWS SDK errors carry a `name`/`Code` (e.g. "SignatureDoesNotMatch",
 * "NoSuchBucket"), a human `message`, and an HTTP status under `$metadata`.
 * Surfacing these to the authenticated operator turns an opaque "Failed to …"
 * into something diagnosable, without leaking credentials.
 */
export function s3ErrorDetail(err: unknown): string {
	const e = err as {
		name?: string;
		Code?: string;
		message?: string;
		$metadata?: { httpStatusCode?: number };
	};
	const label = e?.Code || e?.name;
	const base = [label, e?.message].filter(Boolean).join(': ') || 'Unknown error';
	const status = e?.$metadata?.httpStatusCode;
	return (status ? `[${status}] ${base}` : base).slice(0, 300);
}
