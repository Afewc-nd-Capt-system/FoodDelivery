# AGENTS.md — working rules for vibechops.com (FoodDelivery)

This repo (Afewc-nd-Capt-system/FoodDelivery) is **production-live**: `vibechops.com`
(frontend on Vercel, backend on Render). Every push:

1. **Vercel** auto-builds/deploy the frontend (project `food-delivery-app`, domains
   `vibechops.com`, `www.vibechops.com`, ten-beta alias).
2. **Render** auto-deploys the backend (`vibechops.onrender.com`).

Never push without a local verification pass.

## Commands

```
cd backend
npm run test:e2e          # full production e2e suite (BASE_URL + E2E_ORIGIN env)
npm run test:smoke        # Playwright smoke (BASE_URL env)
npm run test:crawl        # dead-button crawler (BASE_URL env)
npm run test:boot         # production-mode boot test in a clean temp folder
npm run test:limiter      # Redis limiter fallback unit checks
cd frontend && npm run build  # frontend type-check + build
node backend/scripts/check-domain.js vibechops.com  # domain/CORS checks
```

Deploy verification checklist:
- `/health` returns 200 and reports the deployed `commit` hash.
- Render backend: `https://vibechops.onrender.com`
- Frontend deploys via Vercel CLI from repo **root** (never from `frontend/`).
  `npx vercel deploy --prod --yes` then
  `npx vercel alias set <deployment> vibechops.com www.vibechops.com food-delivery-app-ten-beta.vercel.app`.

### Frontend deploy + version proof (exact procedure)

Two Vercel projects exist in `dawudtus-projects`:

- **`food-delivery-app`** — Root Directory `.`, Framework Preset `Services`
  (root `vercel.json`), owns `vibechops.com`, `www.vibechops.com` and
  `food-delivery-app-ten-beta.vercel.app`. **This is the production project and
  should stay.**
- **`food-delivery`** — Root Directory `frontend`, Framework Preset Next.js,
  build `npm run build` (which runs the frontend `prebuild` that removes
  `.next`). It carries the GitHub integration and the `-git-main-` alias, so
  pushes build this legacy project; that is why auto-deploy missed
  `f551a73` while the domain stayed on `food-delivery-app`. Neither project has
  an Ignored Build Step configured. **Do not delete or archive it**; either
  connect the Git integration to `food-delivery-app` (Root `.`, Services) or
  use the manual procedure below.

Manual procedure (from the repo root, never `frontend/`):

1. `git checkout main && git pull`
2. `COMMIT=$(git rev-parse HEAD)` (PowerShell: `$COMMIT = git rev-parse HEAD`)
3. One-time link: `npx vercel link --yes --project food-delivery-app`
4. `npx vercel deploy --prod --yes --build-env NEXT_PUBLIC_BUILD_COMMIT=$COMMIT`
5. `npx vercel alias set <deployment-url> vibechops.com www.vibechops.com food-delivery-app-ten-beta.vercel.app`
6. Verify the frontend version:
   - `curl -s https://vibechops.com/version.json` → `commit` equals `$COMMIT`
   - the homepage `<meta name="build-commit" content="...">` equals `$COMMIT`
7. Verify the backend: `curl -s https://vibechops.onrender.com/health` →
   `commit` equals `$COMMIT`, `migrationsPending: 0`, and `migrationsLastRun` set.
8. Run `BASE_URL=https://vibechops.com npm run test:smoke`; it asserts the same
   commit via `/version.json` and the meta tag.

Backend migrations run automatically at server start (lock + TTL + journal), so
no Render shell step is needed. The admin-only
`GET /api/v2/admin/migrations` lists applied migrations and their results.

## Do-not-revert list (handover critical)

- **Vercel `vercel.json` is frontend-only** (`experimentalServices.frontend`). Do
  NOT re-add the backend service to Vercel; Render serves the API.
- **Redis-backed limiter store** (`src/middleware/rateLimitStore.js`): never
  fail open; memory fallback must keep counting.
- **Invite-only partner registration** (`src/services/partnerInvitation.js` +
  models `PartnerApplication`/`PartnerInvitation`): vendor/restaurant/delivery
  self-registration requires admin-approved invitations.
- **Email-global brute-force lockout** in `src/middleware/bruteForce.js`
  (independent of IP), plus `bruteforce:email:<email>` Redis key.
- **Commission.tenant scoping** in `src/routes/v2/earnings.js` and
  `OrderCompletionService`: never go back to type-wide (global) commission reads.
- **Paid plan activation** requires server-side Paystack verification
  (`src/routes/v2/business-subscriptions.js` `/activate`, `/initialize`).
  No `test_ref` free plan activations.
- **Rider go-online guard**: `v2/riders/availability` rejects online=true until
  rider verification is approved.
- **`ALLOW_LOCALHOST_SERVICES`** env override in `src/middleware/security.js` is
  test-only; never enable it in production (it permits localhost Mongo/Redis).

## Workflow rules

1. **Work on a branch** (`git checkout -b work/<task>`); merge into `main` only
   when, locally: `test:boot` passes, the task's tests pass, and a local smoke
   pass is green. Do not push directly to `main` for experiments.
2. **Test-only changes** (scripts/*.js tests, .e2e env examples, AGENTS.md) must
   not trigger production deploys more than once per task: batch them and push
   together with any code change or after the deploy is verified.
3. Every push must include: `test:boot` green locally + the minimal relevant
   test suite for the change.
4. `.git/hooks/pre-push` runs `npm run test:boot` from `backend/` before every
   push (installed locally via `git config core.hooksPath .githooks`, with
   `.githooks/pre-push` committed).
