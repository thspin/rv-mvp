# Security

## Reporting a vulnerability

Email `seguridad@rv-mvp.example` (or open a private GitHub issue if
the repo is public). Do not open a public issue for a suspected
vulnerability.

## Past incidents fixed in this repo

- **Committed connection string** in `supabase/.temp_old/pooler-url`
  (the project ref, no password). Removed from the working tree in
  commit `d80097f` of the `production-hardening` branch. The file
  is still present in older git commits, so the project ref is
  considered semi-public. The leaked host is `aws-1-us-east-1.pooler.supabase.com`,
  project `eyabtlfkhuzochxaxflj`.
- **Hardcoded secrets in `update-vercel-env.js`** (DATABASE_URL with
  the database password, SUPABASE_SERVICE_ROLE_KEY, BETTER_AUTH_SECRET,
  all the OAuth client secret, and the Upstash token). The file was
  untracked, so it never entered git history, but it was sitting on
  disk in the repo working tree. Anyone with access to the local
  checkout could read it. The file has been deleted. **If you ever
  ran that script in a non-private environment, rotate every secret
  in it immediately.** See "Rotating the leaked secrets" below.
- **Reject-Unauthorized false** in the Postgres Pool in
  `src/lib/auth.ts`. The pool connected to Supabase Postgres without
  verifying the server certificate in production, allowing a network
  attacker to MITM the connection. Fixed in `5e8b4ff`.
- **Cron Bearer-bypass** in `/api/cron` (`6f689e5`). The route
  compared `authHeader` against `Bearer ${CRON_SECRET}`. When
  `CRON_SECRET` was unset, the comparison was against the literal
  string `Bearer undefined`, which any caller could send.
- **Server actions with no auth** in `src/lib/db.ts` (commit
  `a2774a0`). Several "use server" functions (`createNotification`,
  `logActivityAsync`, `checkUpcomingExpirations`,
  `checkUpcomingPaymentDues`) were reachable from the client without
  a session check, and any caller could mutate payment state and
  notification history. Moved to `src/lib/db-internal.ts` (no
  `'use server'`) and the cron route is the only path to them in
  production.

## Cleaning secrets out of git history (BFG)

The `supabase/.temp_old/pooler-url` file is in the git history of
the main branch, even though it was deleted from the working tree
in commit `d80097f`. To scrub it permanently:

1. **Install BFG** (https://rtyley.github.io/bfg-repo-cleaner/). On
   a Mac with Homebrew: `brew install bfg`. On Linux/Windows, download
   the jar from the releases page.
2. **Make a fresh clone** (BFG requires this):
   ```bash
   git clone --no-tags --mirror https://github.com/<org>/rv-mvp.git rv-mvp-mirror
   cd rv-mvp-mirror
   ```
3. **Run BFG** to remove the file from every commit:
   ```bash
   bfg --delete-folders '.temp_old' --no-blob-protection
   ```
   Or to be more specific, replace the file's contents with
   `*** removed ***`:
   ```bash
   bfg --replace-text passwords.txt
   ```
   where `passwords.txt` lists the exact strings to scrub.
4. **Expire reflog + gc**:
   ```bash
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```
5. **Force push** (this rewrites history for everyone):
   ```bash
   git push --force --all
   git push --force --tags
   ```
6. **Coordinate with all collaborators** before step 5. They will
   need to re-clone or `git fetch origin && git reset --hard
   origin/main` after the push, because their local history will
   no longer match.

If BFG isn't available, `git filter-repo` (https://github.com/newren/git-filter-repo)
is the modern equivalent:
```bash
git filter-repo --path supabase/.temp_old --invert-paths
```

Either approach is **destructive and irreversible**. Do it on a
quiet Friday, after the team is warned, and after you've verified
the result in a fresh clone.

## Rotating the leaked secrets

If the database password, the service role key, the Better Auth
secret, the Upstash token, or the Google OAuth client secret was
ever exposed (e.g. `update-vercel-env.js` ran on a shared machine,
or you think the connection string was complete at any point):

1. **Database password**: Supabase Dashboard → Settings → Database →
   "Reset database password". Update `DATABASE_URL` in Vercel.
2. **Service role key**: Supabase Dashboard → Settings → API →
   "Roll" the service_role key. Update `SUPABASE_SERVICE_ROLE_KEY`
   in Vercel. The anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is
   safe to leave alone — it's designed to be public.
3. **Better Auth secret**: Generate `openssl rand -base64 32`,
   update `BETTER_AUTH_SECRET` in Vercel. **All existing user
   sessions will be invalidated** (everyone has to log in again).
4. **Google OAuth client secret**: Google Cloud Console → APIs &
   Services → Credentials → your OAuth client → "Reset secret".
   Update `GOOGLE_CLIENT_SECRET` in Vercel.
5. **Upstash token**: Upstash Console → your Redis database →
   "Roll" the REST token. Update `UPSTASH_REDIS_REST_TOKEN` in
   Vercel.
6. **CRON_SECRET**: Generate `openssl rand -hex 32`, update
   `CRON_SECRET` in Vercel, update the Authorization header in
   your cron job configuration (Vercel cron or wherever).

After rotating, redeploy. The fail-fast env validation in
`src/lib/env.ts` will refuse to boot if any of these are missing,
so an incomplete rotation is loud rather than silent.

## CSP

A Content-Security-Policy header is set in `next.config.ts` for all
responses. See the comments around the `csp` constant for the exact
policy. The policy is intentionally strict in production. If you
add a new external service that the browser needs to talk to
(stripe.js, a Sentry tunnel, an analytics script, a WebSocket
endpoint), update the `connect-src` and `script-src` directives
accordingly, and verify the change locally before deploying.

## TLS

The Postgres Pool uses `ssl: { rejectUnauthorized: true }` in
production. The connection string must include a CA that the Node
runtime can verify (Supabase's published `?sslmode=verify-full`
URLs work out of the box). If you need to add a custom CA, the
cleanest place is in the connection string itself; don't disable
verification.
