# OSSALT Bluesky publisher (draft / NOT deployed)

Isolated Cloudflare Worker + D1 publisher for `ossalt.bsky.social`. It does not change the Next.js site and never sends X posts. **Deployment, production D1, and credentials have NOT been performed.**

## Design and safety

- One approved post **per Japan date**; `day_jst` is unique.
- Admin-only `POST /queue` adds the **exact reviewed text** for that day's 12:15 JST publication.
- Cron `15 3 * * *` is 03:15 UTC = 12:15 JST. Cron timing can be delayed; posts older than 30 minutes are not sent late.
- `PUBLISH_ENABLED=false` by default. No automatic posting before the operator explicitly enables it.
- A D1 compare-and-set claim prevents concurrent cron invocations from both sending a post.
- Stable per-date ATProto `rkey`; query the remote record before creating it and again afterwards.
- If any outcome is ambiguous, mark `needs_review`; **never blindly retry**.
- Authenticated `POST /reconcile` only checks the remote record, never publishes or retries.
- Authenticated `GET /posts` shows status and errors; `GET /health` is public and contains no secrets.
- Credentials exist only as Cloudflare Worker secrets, never in Git or API responses.
- Metricool remains unchanged; no account disconnect or cleanup is performed.

## Setup by operator (not run)

Prerequisites: Cloudflare account with Workers/D1, Node and Wrangler, Bluesky **app password** for ossalt.bsky.social.

1. Create D1:
   `npx wrangler d1 create ossalt-bluesky-queue`
2. Fill in the returned `database_id` in `automation/bluesky/wrangler.jsonc`.
3. From `automation/bluesky`, apply migration:
   `npx wrangler d1 migrations apply ossalt-bluesky-queue --remote`
4. From `automation/bluesky`, provision secrets **interactively**:
   `npx wrangler secret put ADMIN_TOKEN`
   `npx wrangler secret put BSKY_APP_PASSWORD`
   Use a high-entropy admin bearer token and the dedicated Bluesky app password. Never use account's primary password.
5. Deploy from `automation/bluesky` with `npx wrangler deploy`. It starts with `PUBLISH_ENABLED=false`.
6. Confirm `GET /health` returns `enabled:false`. Test the queue, authorization, and `/posts` before any live publication.
7. After review and an approved live-post test procedure, change `PUBLISH_ENABLED` to `true` and deploy. Do not accidentally enable the cron while Metricool is also capable of posting: disable the old Bluesky schedule first, after confirming which system owns that day's post.

## Adding a reviewed post

After setting `ADMIN_TOKEN` in your own shell environment (never write to Git):
```sh
curl -X POST "$WORKER_URL/queue" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"day_jst":"2026-11-26","text":"Reviewed post with exactly one https://ossalt.jp/ URL"}'
curl "$WORKER_URL/posts" -H "Authorization: Bearer $ADMIN_TOKEN"
```

If a post has `needs_review` or `publishing`, first inspect it (and the Bluesky profile) before running:
```sh
curl -X POST "$WORKER_URL/reconcile" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"day_jst":"2026-11-26"}'
```
This endpoint **will not** publish anything. An absent record requires manual investigation, not a blind retry.

## What is deliberately NOT automated

- Creation of text (current daily ChatGPT workflow prepares X/Bluesky copy).
- Automatic enqueue from chat (a scheduled task cannot directly invoke this private endpoint without an authorized integration).
- Manual approval/review of the content; enqueueing through the admin API is the approval step.
- Production deploy, D1 creation, Secrets configuration, or posting a live test.
- X publication (manual only).

## Validation

`node --test automation/bluesky/test/index.test.mjs`

Use Wrangler `dev` and the scheduled trigger tester for integration testing. Never print or persist session JWTs or app passwords. The D1 ledger captures publish status and an explicit error; it intentionally does not include raw secrets. Monitor Cloudflare logs; if `publishing` is stuck, reconcile manually because an interrupted request may already have posted.

Cloudflare docs: https://developers.cloudflare.com/workers/configuration/cron-triggers/
ATProto docs: https://bsky.network/docs/bluesky-api/
