import { describe, it, expect } from 'vitest';
import { describePutFailure, readApiError } from './upload-errors';

describe('describePutFailure', () => {
	it('explains the silent blocked case (status 0) with the host and likely causes', () => {
		const msg = describePutFailure(
			{ status: 0, responseText: '', statusText: '' } as XMLHttpRequest,
			'https://10.196.165.254/tnd-s3/file.txt?X-Amz-Signature=abc'
		);
		expect(msg).toMatch(/blocked/i);
		expect(msg).toContain('10.196.165.254');
		expect(msg).toMatch(/CORS/);
		expect(msg).toMatch(/certificate|TLS/i);
	});

	it('extracts the S3 XML <Code> and <Message> on an HTTP error', () => {
		const xml =
			'<?xml version="1.0"?><Error><Code>SignatureDoesNotMatch</Code>' +
			'<Message>The request signature we calculated does not match.</Message></Error>';
		const msg = describePutFailure(
			{ status: 403, responseText: xml, statusText: 'Forbidden' } as XMLHttpRequest
		);
		expect(msg).toContain('403');
		expect(msg).toContain('SignatureDoesNotMatch');
		expect(msg).toContain('does not match');
	});

	it('falls back to status + statusText when there is no XML body', () => {
		const msg = describePutFailure(
			{ status: 500, responseText: '', statusText: 'Internal Server Error' } as XMLHttpRequest
		);
		expect(msg).toContain('500');
		expect(msg).toContain('Internal Server Error');
	});
});

describe('readApiError', () => {
	it('combines error and detail fields from a JSON response', async () => {
		const res = { json: async () => ({ error: 'Failed to generate upload URL', detail: 'SignatureDoesNotMatch' }) } as Response;
		expect(await readApiError(res, 'fallback')).toBe('Failed to generate upload URL (SignatureDoesNotMatch)');
	});

	it('uses the error field alone when there is no detail', async () => {
		const res = { json: async () => ({ error: 'Unauthorized' }) } as Response;
		expect(await readApiError(res, 'fallback')).toBe('Unauthorized');
	});

	it('falls back with the HTTP status when the body is not JSON', async () => {
		const res = { status: 502, json: async () => { throw new Error('not json'); } } as unknown as Response;
		expect(await readApiError(res, 'Failed to get upload URL')).toBe('Failed to get upload URL (HTTP 502)');
	});
});
