import type { S3Credentials, UserIdentity } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			credentials?: S3Credentials;
			user?: UserIdentity;
			/** Name of the only bucket the app is allowed to access (S3_BUCKET env var). */
			singleBucket?: string;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
