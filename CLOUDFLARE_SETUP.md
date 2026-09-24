# Cloudflare leaderboard and premium store setup

The repository previously contained only static game files and a GitHub Pages workflow. This change adds a Worker module and D1 migration, but it does not create Cloudflare resources or payment credentials.

## Deploy the Worker on the existing Cloudflare project

1. Create a D1 database named `cash-empire` in Cloudflare. Note its UUID.
2. Copy `wrangler.example.jsonc` to `wrangler.jsonc`. Keep your existing Worker name if it differs, insert the real D1 UUID, and keep the `DB` and `ASSETS` binding names.
3. Apply `migrations/0001_leaderboard_store.sql` with `wrangler d1 migrations apply cash-empire --remote`.
4. Configure your Cloudflare Git deployment to deploy from the repository root with the Wrangler configuration, or run `wrangler deploy`. The Worker serves static assets from `./CashEmpire` and handles `/api/*`.
5. Set `SESSION_SECRET` as a Worker secret before connecting an account provider. Use a long random value. Do not put it in the repository.

The existing GitHub Pages site continues to work as a guest game. Pages cannot access same-origin Worker APIs; the leaderboard and premium entitlement require opening the Cloudflare-hosted game.

## Account integration

No login or account creation endpoint is included yet. The future trusted authentication flow must create a `users` row and issue an HttpOnly, Secure, SameSite=Lax `ce_session` cookie. The Worker verifies an HMAC-SHA256 signature over a base64url JSON payload `{"uid":"user-id","exp":milliseconds-since-epoch}`. `createSessionToken` is exported from `worker/index.js` for the trusted issuer. Never issue sessions in browser code.

The `progress` row is created by the Worker on first authenticated request. Legacy localStorage saves cannot be accepted as verified leaderboard results. The future signed-in game should send individual actions to `POST /api/progress/action` with a unique `actionId`, and read `GET /api/progress/snapshot`. The Worker calculates income and costs from its own configuration and rejects client-supplied totals. Its action API covers clicks, business purchases, regular upgrades, prestige investments and rebirth; Golden Bill rewards remain local until a server-issued event protocol is added. Accounts must use server progress for ranked play.

Usernames are validated to 3–24 letters, digits, spaces, underscores or hyphens. Signed-in users can update a name at `POST /api/profile/username`.

## Optional €2 payment activation

The Store visibly shows 2x Money but reports “Payments are not available yet” until all of these are configured:

- A Stripe account, with a secret API key stored as Worker secret `STRIPE_SECRET_KEY`.
- A Stripe webhook endpoint at `https://YOUR-CLOUDFLARE-DOMAIN/api/store/webhook` subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded`; store its signing secret as `STRIPE_WEBHOOK_SECRET`.
- `PUBLIC_SITE_URL` set to the HTTPS URL of the Cloudflare-hosted game.

Checkout creates a server-priced €2.00 Stripe Session. Only a verified paid webhook tied to a recorded Session grants `double_money` in D1. Return redirects never grant an entitlement. The Worker never handles card data.

## Security model

- The browser cannot submit cash, lifetime cash or rebirth totals. The action endpoint calculates outcomes and uses optimistic version checks plus action IDs to reject conflicting/replayed updates.
- The public leaderboard reads only server progress in D1, ordered by effective lifetime cash.
- Entitlement is read from D1 for a verified session. It is not saved in localStorage. The local game activates 2x only after a successful same-origin Worker response.
- Without login, the leaderboard contains no example players. Without Stripe configuration, no purchase is simulated.
- The existing local guest game remains playable and keeps its save format. Browser JavaScript can always be modified locally, so only server progress is suitable for competitive rankings.
