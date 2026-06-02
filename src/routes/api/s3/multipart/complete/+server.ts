import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, object } from '$lib/server/s3';
import { s3ErrorDetail } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request, locals }) => {
	let bucket: string | undefined;
	let key: string | undefined;
	try {
		const body = await request.json();
		bucket = body.bucket;
		key = body.key;
		const { uploadId, parts } = body;

		if (!bucket || !key || !uploadId || !parts || !Array.isArray(parts)) {
			return json(
				{ error: 'bucket, key, uploadId, and parts array are required' },
				{ status: 400 }
			);
		}

		const client = createS3Client(locals.credentials!);
		await object.completeMultipart(client, bucket, key, uploadId, parts);

		return json({ success: true });
	} catch (err: any) {
		console.error(`Complete multipart upload error for ${bucket ?? '?'}/${key ?? '?'}:`, err);
		return json(
			{ error: 'Failed to complete multipart upload', detail: s3ErrorDetail(err) },
			{ status: 500 }
		);
	}
};
