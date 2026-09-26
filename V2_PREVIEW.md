# ClickTheCash V2 local preview

V2 lives on the `clickthecash-v2` branch. It has not been deployed to the production domain.

From the repository root in Windows PowerShell:

```powershell
git switch clickthecash-v2
npx.cmd wrangler d1 migrations apply clickthecash-v2-local --local --config wrangler.v2-local.jsonc
npx.cmd wrangler dev --local --config wrangler.v2-local.jsonc --port 8788
```

Open <http://localhost:8788>.

The V2 preview uses a separate local D1 database. Do not add `--remote` or use the production `wrangler.jsonc` for V2 preview. Google Sign In and checkout need their existing external services and are not required to inspect the local guest UI. The existing save key and cloud API/data model stay unchanged so the future V2 can read existing progress.
