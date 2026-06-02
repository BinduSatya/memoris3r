/**
 * Helpers for turning failed uploads into actionable messages.
 *
 * Uploads go browser → S3 directly via presigned URLs, so the most common
 * failures never reach our server and surface only as opaque XHR errors.
 * These helpers translate those into something a user can act on, and pull
 * the real reason out of S3 / API error responses.
 */

/** Minimal shape of the bits of XMLHttpRequest we read — keeps it testable. */
type PutXhr = Pick<XMLHttpRequest, 'status' | 'statusText' | 'responseText'>;

/**
 * Build a human-readable error from a failed presigned-PUT request.
 *
 * `status === 0` is the important silent case: the request never completed,
 * so the browser exposes no detail. It almost always means the S3 endpoint
 * rejected the cross-origin request (bucket CORS not configured) or its TLS
 * certificate isn't trusted by the browser (common with self-signed certs on
 * internal endpoints — note that S3_INSECURE_TLS only affects the server, not
 * the browser's direct upload).
 */
export function describePutFailure(xhr: PutXhr, url?: string): string {
	if (xhr.status === 0) {
		let host = '';
		try {
			host = url ? new URL(url).host : '';
		} catch {
			/* ignore unparseable url */
		}
		return (
			`The upload was blocked before reaching storage${host ? ` (${host})` : ''}. ` +
			`This usually means the S3 endpoint rejected the cross-origin request ` +
			`(bucket CORS not configured to allow PUT from this app) or its TLS ` +
			`certificate isn't trusted by the browser. Check the browser Network tab ` +
			`for the blocked request.`
		);
	}

	const body = xhr.responseText || '';
	const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
	const message = body.match(/<Message>([^<]+)<\/Message>/)?.[1];
	if (code || message) {
		return `Storage rejected the upload (HTTP ${xhr.status}${code ? ` ${code}` : ''})${
			message ? `: ${message}` : ''
		}`;
	}

	return `Upload failed with HTTP ${xhr.status}${xhr.statusText ? ` ${xhr.statusText}` : ''}`;
}

/** Extract a useful message from a JSON API error response (`{ error, detail }`). */
export async function readApiError(res: Response, fallback: string): Promise<string> {
	try {
		const data = await res.json();
		const base = data?.error || fallback;
		return data?.detail ? `${base} (${data.detail})` : base;
	} catch {
		return `${fallback} (HTTP ${res.status})`;
	}
}
