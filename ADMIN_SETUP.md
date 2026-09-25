# ClickTheCash administration

The admin panel is at `/admin` on the production domain. It never reveals private Google identity data. All `/api/admin/*` routes check a live session and the `admin_users` table. The frontend button is only a convenience; it is not an authorization check.

## Add the first owner

Run these commands from the repository root **after migration 0005 is applied**. Replace the placeholder with the `users.id` of your own existing signed-in account. Do not use a username in the INSERT and do not paste any Google secrets.

```powershell
$ownerId = Read-Host 'Your existing users.id'
if ($ownerId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { throw 'Expected a UUID users.id' }
npx wrangler d1 execute cash-empire --remote --command "INSERT INTO admin_users(user_id,role,created_at_ms) SELECT id,'owner',CAST(unixepoch('now')*1000 AS INTEGER) FROM users WHERE id='$ownerId' AND google_subject IS NOT NULL AND NOT EXISTS(SELECT 1 FROM admin_users WHERE role='owner');"
npx wrangler d1 execute cash-empire --remote --command "SELECT a.user_id,a.role,u.username FROM admin_users a JOIN users u ON u.id=a.user_id WHERE a.role='owner';"
```

A missing user ID inserts zero rows. The partial unique index allows only one owner. Sign out and back in, or refresh the game, to see the Admin link.

To discover your ID without showing Google data, run a read-only query using your exact chosen username:

```powershell
npx wrangler d1 execute cash-empire --remote --command "SELECT id,username FROM users WHERE username_normalized=lower('REPLACE_WITH_YOUR_USERNAME') AND google_subject IS NOT NULL;"
```

## Roles

- Moderator: player search, username moderation, timeouts and timeout removal.
- Admin: moderator actions, bans/unbans, money grants and temporary boosts.
- Owner: all actions, permanent boosts, resets/restores and admin/moderator role management.

No API action can grant or remove the owner role. A suspended admin cannot use admin APIs. Admins cannot moderate peers or higher roles.

## Reset and recovery

Reset requires a selected player, an audit reason, the exact `RESET <username>` text and a final confirmation. It captures the complete progress row before changing it, increments the progress generation, and retires older browser action queues. It resets cash, earnings, rebirths, businesses, upgrades, booster inventory, playtime and event state. It preserves the user account, Google identity, username, purchases, paid entitlements, admin role, boosts, moderation state, audit entries and the recovery snapshot. The owner can restore the latest snapshot using `RESTORE <username>` and a final confirmation. Restore also advances the generation, so stale browser actions cannot replay.

Bans revoke only the target user's sessions and preserve their progress and payments. A banned Google account cannot create another session. Timeouts and temporary boosts expire by timestamp without periodic database writes.
