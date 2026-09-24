# Cloudflare Worker setup for Click The Cash

The static game runs without an account. Google sign in, server-verified leaderboard progress, and premium ownership require this repository's Worker plus D1. The production site is `https://clickthecash.online`. The OAuth code uses the same-origin callback `https://clickthecash.online/api/auth/google/callback`.

## 1. Google Cloud Console

1. Create or select a Google Cloud project and configure the OAuth consent screen.
2. Create an OAuth 2.0 **Web application** client.
3. Add **Authorized JavaScript origin**: `https://clickthecash.online`.
4. Add **Authorized redirect URI**: `https://clickthecash.online/api/auth/google/callback`.
5. Copy the client ID and client secret. No values are stored in the repository.
6. For a separate local Worker, use a separate OAuth client and set its exact local origin/callback, such as `http://localhost:8787` and `http://localhost:8787/api/auth/google/callback`. Set that Worker's `PUBLIC_SITE_URL` to the same local origin.

The Worker uses authorization code flow, PKCE, state, nonce, and a server-verified Google ID token. It only stores the stable Google subject, not the player's Google email or name.

## 2. D1 and Worker deployment

1. Create a D1 database, for example `cash-empire`, and note its UUID.
2. Copy `wrangler.example.jsonc` to `wrangler.jsonc`. Set the **existing Worker name**, real D1 UUID, and keep `main: worker/index.mjs`, `DB`, `ASSETS`, `assets.directory: ./CashEmpire`, and `run_worker_first: ["/api/*"]`. The Worker must serve both static files and API on `clickthecash.online`.
3. Apply both migrations in order with `wrangler d1 migrations apply cash-empire --remote`. If the original migration is already applied, Wrangler applies only `0002_google_accounts.sql`.
4. Set a nonsecret Worker variable `PUBLIC_SITE_URL=https://clickthecash.online`.
5. Configure the existing Cloudflare Git deployment to deploy the Worker from the repository root using the Wrangler config. The current repository also retains a GitHub Pages workflow for guest play. A static-only Cloudflare build does **not** publish `/api/*`.
6. Verify `https://clickthecash.online/api/health` returns JSON after deployment. A 404 means the static site is live but the Worker API has not been deployed or routed.

Keep real Cloudflare resource IDs in your existing deployment configuration. Do not use the placeholder UUID in `wrangler.example.jsonc`.

## 3. Worker secrets

Set these as Cloudflare Worker secrets, never frontend code or GitHub files:

- `GOOGLE_CLIENT_ID` — Web application client ID.
- `GOOGLE_CLIENT_SECRET` — matching Web application client secret.
- `SESSION_SECRET` — long random value (at least 32 random bytes). It signs the short OAuth flow cookie.

Sessions use random opaque cookies; D1 stores only a SHA-256 token hash. Cookies are HttpOnly, SameSite=Lax and Secure on HTTPS. Sign out deletes the session row.

## 4. Existing saves and verified leaderboard runs

The old `cash-empire-save-v1` browser save stays readable. First login asks the player to choose a username, then choose between their existing local game and a new verified cloud run. Local saves are not imported into global rankings because browser data can be edited. Starting the verified run backs up the local state under `cash-empire-local-backup-v1`; Account has a Restore browser save action. A new device with no local progress loads the same account's server run.

Verified runs batch clicks about every 10 seconds. The Worker computes click income, purchase prices, passive production, Golden Bill reward, prestige and rebirths. It refuses client-submitted money totals. Offline passive income uses 50% efficiency. The public leaderboard includes only accounts with chosen usernames and ranks by lifetime money, rebirths, then internal ID.

## 5. Optional payment activation

The Store remains visible but says **Payments coming soon** until the existing Stripe integration is configured. It never grants a purchase from a redirect or localStorage.

For later activation, set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as Worker secrets and create a Stripe webhook at `https://clickthecash.online/api/store/webhook` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. `PUBLIC_SITE_URL` must be set. A verified paid webhook writes the `double_money` entitlement to D1. The Worker does not handle card details.

## Notes

- Do not enter or commit live OAuth, Stripe or Cloudflare secrets in this repository.
- OAuth cannot complete until the real Google credentials, D1 binding, migrations and Worker route are configured.
- The GitHub Pages version remains a guest game; its same-origin API routes do not point to Cloudflare.
