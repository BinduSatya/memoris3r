# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A SvelteKit web file manager for any S3-compatible storage (AWS, MinIO, Backblaze B2, DigitalOcean Spaces, Ceph). Runs on the Node adapter, ships as a ~50MB Alpine Docker image, and uses **no database** — all auth state lives in an encrypted session cookie.

## Commands

```bash
npm run dev              # dev server → http://localhost:5173
npm run build            # production build (adapter-node → ./build)
npm run check            # svelte-check type checking (run after edits)

npm run test:unit        # Vitest unit tests (server logic, mocked AWS SDK — no MinIO needed)
npm run test:unit:watch
npx vitest run src/lib/server/s3.test.ts   # single unit test file

npm run e2e:setup        # start MinIO + seed 10K objects across 5 buckets (Docker)
npm run test:e2e         # all Playwright tests (auto-starts dev server)
npm run test:e2e:api     # API-level specs only (e2e/api)
npm run test:e2e:browser # UI/browser specs only (e2e/ui)
npm run e2e:teardown     # stop MinIO, remove volumes
npx playwright test e2e/api/auth.spec.ts   # single e2e file
```

E2E tests require MinIO running (`npm run e2e:setup` first) and Playwright browsers (`npx playwright install chromium`). MinIO: `http://localhost:9000`, creds `minioadmin`/`minioadmin`. See `e2e/README.md` for seeded bucket layout.

## Architecture

**Request lifecycle is driven entirely by `src/hooks.server.ts`.** This single file implements all four auth modes, route protection, single-bucket enforcement, and security headers. Read it first before touching auth or routing. The modes (resolved per-request in this order):

1. **Fixed credentials** (`S3_ACCESS_KEY` + `S3_SECRET_KEY`) — login skipped, all users share server-side creds.
2. **Fixed creds + OIDC** — OIDC gates access, fixed creds supply S3 once authenticated.
3. **OIDC** (`OIDC_ISSUER`/`OIDC_CLIENT_ID`/`OIDC_CLIENT_SECRET`) — SSO gate, then per-user manual S3 creds.
4. **Manual** (default) — users enter their own access key/secret/endpoint/region.

The hook populates `event.locals.credentials` / `event.locals.user` (typed in `src/app.d.ts`). API handlers assume these are set (`locals.credentials!`) because the hook already rejected unauthenticated requests to `/api/s3/*` and `/browse/*`.

**Single-bucket mode** (`S3_BUCKET` env): the hook rejects (403) any `/api/s3` request whose `?bucket=` query param or JSON `bucket` body field differs from the configured bucket. Note: to inspect the JSON body the hook consumes the request stream and re-wraps `event.request` with a fresh `Request` so downstream handlers can still read it — preserve this pattern if you add body checks. Login validates via `HeadBucket` instead of `ListBuckets`.

**S3 access is centralized in `src/lib/server/s3.ts`.** Every S3 operation is a module-private function exported through two namespaced objects: `object.*` (list, copy, move, search, multipart, tags, retention…) and `bucket.*` (create, versioning, policy, CORS…). API routes do `createS3Client(locals.credentials!)` then call these. Add new S3 operations here and wire them into those export objects rather than calling the AWS SDK from routes. `forcePathStyle: true` is set whenever an endpoint is given (required for MinIO/most non-AWS). `S3_INSECURE_TLS=true` swaps in an HTTPS agent that skips cert verification (internal self-signed endpoints).

**Sessions** (`src/lib/server/session.ts`): `SessionPayload` is `{ credentials?, user? }`, encrypted AES-256-GCM as `iv:tag:ciphertext` hex into the `s3session` cookie. The key is `sha256(SESSION_SECRET)`. In production a default `SESSION_SECRET` throws on startup. `decryptSession` has backward-compat handling for an older top-level-credentials cookie format.

**File transfers bypass the server.** Upload/download use presigned URLs so the browser talks to S3 directly. The server only mints URLs (`object.getUploadUrl` / `getDownloadUrl`). Large files (≥100MB, `MULTIPART_THRESHOLD`) use client-driven multipart upload: `src/lib/multipart-upload.ts` orchestrates presigned-part URLs against the `/api/s3/multipart/*` routes (initiate → presign-part → complete/abort), with concurrency, progress, and resume.

### Layout

- `src/routes/api/` — JSON API endpoints (`+server.ts`). Convention: try/catch, `json({ error }, { status })` on failure, `console.error` the real error.
- `src/routes/browse/[...path]/+page.svelte` — the main file-browser UI; orchestrates all panels/modals.
- `src/routes/+page.svelte` — login page.
- `src/lib/components/` — Svelte 5 components (runes: `$state`, `$props`, etc.). Co-located `*.test.ts` are Vitest + Testing Library.
- `src/lib/stores/*.svelte.ts` — runes-based client stores (transfers, bookmarks). Bookmarks persist to localStorage.
- `src/lib/server/` — server-only modules (`s3.ts`, `session.ts`, `oidc.ts`). Never import these into client code.
- `src/lib/types.ts` — shared domain types (`S3Credentials`, `S3Object`, `BucketDetails`, etc.).

## Conventions

- **Svelte 5 runes** throughout — use `$state`/`$derived`/`$props`, not Svelte 4 stores or `export let`.
- **Indentation is tabs** in `.ts` files, 2 spaces in `.svelte` files — match the file you're editing.
- UI uses **flowbite-svelte** components + Tailwind v4 (via `@tailwindcss/vite`).
- New S3-backed features generally need: a function in `s3.ts` (+ its export entry), an API route under `src/routes/api/s3/`, an e2e API spec, and UI wiring. Mirror an existing feature (e.g. tags or CORS) end-to-end.
- Errors returned to clients are generic strings; detailed errors go to `console.error` only.

## Deployment

Multi-arch images publish to `ghcr.io/OWNER/s3-viewer` on push to `main` and version tags. A Helm chart lives in `./chart`. `ORIGIN` must match the public URL (SvelteKit CSRF). The app expects to sit behind a reverse proxy for TLS/rate-limiting. See `README.md` for full Docker/Helm/env reference.
