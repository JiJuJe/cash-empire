# Cash Empire

A complete, original, lightweight incremental game built with HTML, CSS, and vanilla JavaScript.

## Play locally

Open [CashEmpire/index.html](CashEmpire/index.html) in a browser. No build step, server, package manager, or network connection is needed.

## GitHub Pages

The repository includes a Pages workflow that publishes the contents of `CashEmpire/` when `main` changes. In repository **Settings → Pages**, select **GitHub Actions** as the build source. The root `index.html` also redirects to the game when using branch based Pages hosting.

## Gameplay

Click the cash pile to earn money. Buy businesses for automatic income, collect Golden Bills, unlock upgrades and achievements, then rebirth for permanent Empire Points. Progress saves in this browser every 10 seconds and after purchases. Export a save code to move progress to another browser.

## Files

- `CashEmpire/index.html` — interface
- `CashEmpire/style.css` — artwork, layout, and animation
- `CashEmpire/script.js` — game configuration and systems
- `CashEmpire/assets/` — local business artwork

All prices and production values are in configuration arrays near the top of `script.js`.

## Leaderboard and premium Store

The game includes Leaderboard and Store navigation. A Cloudflare Worker and D1 migration for verified account progress and the optional €2.00 2x Money checkout are in `worker/` and `migrations/`. No example players or fake purchase completion is shown. See [CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md) for the required Cloudflare and optional Stripe setup. Guest saves stay local and keep working on GitHub Pages.
