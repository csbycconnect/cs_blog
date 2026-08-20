# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ByteBoard — a React 19 + Vite 7 editorial/blog platform for a university CS department. Deployed on Vercel: the frontend is static, and `api/` contains Vercel serverless functions (Node, ESM) that talk to DynamoDB and Cognito directly. There is no separate backend server.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview a production build
- `npm run lint` is defined in package.json but **eslint is not an installed dependency** — the script currently fails with "eslint is not recognized". Don't rely on it to validate changes; use `npm run build` instead to catch syntax/import errors.
- No test suite exists in this repo.

## Architecture

- **Frontend → backend**: pages call `src/services/*.js` (`articles.js`, `users.js`, `events.js`, `email.js`), which `fetch()` the `/api/*` routes. This is the path actually used in production.
- **Legacy dead path — do not extend**: `src/lib/aws-config.js` + `src/lib/api.js` talk to DynamoDB directly from the browser using `VITE_AWS_ACCESS_KEY_ID`/`VITE_AWS_SECRET_ACCESS_KEY`. Since Vite inlines `VITE_`-prefixed vars into the public bundle, populating those env vars would ship real AWS credentials to every visitor. Still imported by `Calendar.jsx`, `HeroArticle.jsx`, `AnimatedList.jsx` — route any new work through `src/services/*` instead, and treat removing these imports as a standing cleanup item.
- **DynamoDB**: single-table design (`bb_articles`, `bb_users`), `PK`/`SK` pattern (`ARTICLE#<id>` / `METADATA`), with `GSI1`/`GSI2`/`GSI3` for status/author/date queries. Article IDs get normalized with inconsistent prefixes (`ARTICLE#`, `ART_`, `ART#`) across `api/articles/index.js` and `api/lib/db/articles.js` — when touching ID handling, check both call sites.
- **Auth**: AWS Cognito via `amazon-cognito-identity-js`. Admin/editorial role = membership in a Cognito group named `AL0`/`AL1`/`AL2`, or any group matching `/admin/i` (checked client-side in `src/components/shared/AdminRoute.jsx`, and server-side via `isAdmin()` in `api/lib/auth/verifyAuth.js`).
- **API auth**: every mutating/admin route must call `requireAuth`/`isAdmin`/`isSelfOrAdmin` from `api/lib/auth/verifyAuth.js` before touching the database — this was retrofitted in Aug 2026 after every endpoint was found to trust the client with zero server-side checks. When adding a new mutating endpoint, gate it the same way; don't assume the frontend's route guard is sufficient. The frontend attaches the bearer token via `src/lib/authToken.js` (`authHeaders()`), which reads the current Cognito ID token from the SDK's session cache — use it for any new authenticated `fetch()` call.
- **Internal server-to-server calls**: `api/articles/index.js` calls `api/send-email` directly (to notify authors on status changes) using a shared `x-internal-api-key` header (`INTERNAL_API_SECRET` env var) rather than a user token, since there's no end-user session for that call.
- **Email**: `api/send-email/index.js` sends via Nodemailer/Gmail SMTP (`NODE_SERVER_EMAIL_*` env vars), not from the site's own domain — the "From" address is always the shared Gmail account.

## Env vars

Client (`VITE_`-prefixed, inlined into the public bundle — never put secrets here beyond what's already there): `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`, `VITE_COGNITO_CLIENT_SECRET` (optional), `VITE_DYNAMODB_TABLE_NAME`, `VITE_EMAILJS_*`. Avoid ever setting `VITE_AWS_ACCESS_KEY_ID`/`VITE_AWS_SECRET_ACCESS_KEY` (see legacy path above).

Server-only (Vercel function env, not `VITE_`-prefixed): `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `DYNAMODB_USERS_TABLE_NAME`, `NODE_SERVER_EMAIL_HOST`/`_PORT`/`_USER`/`_PASS`/`_SECURE`, `INTERNAL_API_SECRET`, `APP_ORIGIN` (optional, tightens CORS from `*`).

## Repo hygiene

- `old_admin.jsx`, `update_faculty.py`, `update_faculty.cjs`, `build_log.txt`, `py_err.txt` at the repo root are leftover cruft from past debugging/one-off scripts, not part of the app — don't treat them as reference for current patterns.
- `vercel.json` rewrites reference `api/articles/like.js`, `views.js`, `details.js`, which don't exist (only `api/articles/index.js` does, routed by an `action` field in the POST body). Those rewrite rules are dead.
- Windows dev environment: files are CRLF; git will warn about LF→CRLF conversion on commit — this is expected, not an error.

## Branches

`main` and `ranchh` are both active long-lived branches (this repo has no CI-enforced branch protection). Confirm with the user which branch to target before pushing — don't assume `main`. Merge PRs rather than rebasing (existing history uses merge commits).
