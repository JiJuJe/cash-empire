# ClickTheCash

A lightweight original clicker game built with HTML, CSS, and vanilla JavaScript.

Open `CashEmpire/index.html` locally for guest play. Browser progress continues to use the compatible `cash-empire-save-v1` localStorage format. The main money pile earns cash directly; businesses automate production. Upgrades, achievements, Golden Bills, rebirth and offline earnings are included.

The production Cloudflare Worker serves `CashEmpire/` and `/api/*` on `https://clickthecash.online` when configured. Google account login uses D1-backed sessions, unique public usernames, a server-validated Top 30 leaderboard and an account-based cloud run. Existing browser saves remain separate and can be backed up before a verified run begins. The Store's 2x Money entitlement is only read from the server.

See `CLOUDFLARE_SETUP.md` for the exact Google OAuth redirect, D1 migrations, Worker bindings and secrets. The GitHub Pages workflow remains for guest play.
