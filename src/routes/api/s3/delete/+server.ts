import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createS3Client, object } from '$lib/server/s3';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { bucket, keys, versionId } = body;

		if (!bucket || !keys || !Array.isArray(keys) || keys.length === 0) {
			return json({ error: 'bucket and keys (array) are required' }, { status: 400 });
		}

		const client = createS3Client(locals.credentials!);

		// Version-specific deletion: single key + versionId
		if (versionId && typeof versionId === 'string' && keys.length === 1) {
			await object.deleteVersion(client, bucket, keys[0], versionId);
			return json({ success: true, deleted: 1 });
		}

		// Folder keys (trailing slash) must be deleted recursively — deleting the
		// prefix marker alone leaves the contents orphaned. Plain object keys are
		// bulk-deleted as before.
		const folderKeys = keys.filter((k: unknown): k is string => typeof k === 'string' && k.endsWith('/'));
		const fileKeys = keys.filter((k: unknown): k is string => typeof k === 'string' && !k.endsWith('/'));

		let deleted = 0;
		for (const folder of folderKeys) {
			const result = await object.deleteFolder(client, bucket, folder);
			deleted += result.deleted;
		}
		if (fileKeys.length > 0) {
			await object.deleteMany(client, bucket, fileKeys);
			deleted += fileKeys.length;
		}

		return json({ success: true, deleted });
	} catch (err: any) {
		console.error('Delete error:', err);
		return json({ error: 'Failed to delete objects' }, { status: 500 });
	}
};
