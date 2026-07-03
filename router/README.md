# MikroTik Router Sync

The router talks to Supabase directly — there is no VPS or bridge service. A
scheduled RouterOS script polls the `router-sync` Supabase Edge Function every
60 seconds over outbound HTTPS, which works fine behind CGNAT because the
router only makes outgoing requests.

```
MikroTik (RouterOS v7)                    Supabase
  pixl-sync script  ──HTTPS──▶  Edge Function router-sync
    pull  ◀── pending enable/disable commands (from `commands` table)
    confirm ──▶ marks commands acknowledged/failed, updates client status
    report  ──▶ upserts daily rows in `usage`, updates client status
```

The web app (PayMongo webhook, admin Enable/Disable toggle, overdue billing
check) only ever writes rows to the `commands` table. The router drains it.

## Requirements

- RouterOS **v7.13 or newer** (the script uses `:deserialize` for JSON).
- A PPPoE server on this router whose secret names match `clients.pppoe_username`.
- The `router-sync` Edge Function deployed (see below).

## 1. Deploy the Edge Function (once, from your PC)

```bash
supabase functions deploy router-sync --no-verify-jwt
supabase secrets set ROUTER_SECRET=$(openssl rand -hex 32)
```

`--no-verify-jwt` is required — the router authenticates with the shared
secret, not a Supabase JWT. Keep the generated secret; you'll paste it into
the script. Never put the Supabase service role key on the router.

## 2. Configure the script

Edit the two values at the top of [pixl-sync.rsc](pixl-sync.rsc):

- `baseUrl` — `https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/router-sync`
- `secret` — the same value you set as `ROUTER_SECRET`

## 3. Install on the router

Upload the file (Winbox → Files, or FTP/SFTP), then in the RouterOS terminal:

```routeros
/import pixl-sync.rsc
```

Importing runs it once — check it worked:

```routeros
/log print where message~"pixl-sync"
```

Then save it as a named script and schedule it every 60 seconds. In Winbox:
System → Scripts → paste the file contents into a script named `pixl-sync`,
or from the terminal:

```routeros
/system script add name=pixl-sync source=[/file get pixl-sync.rsc contents]
/system scheduler add name=pixl-sync interval=1m on-event="/system script run pixl-sync" comment="PIXL billing sync"
```

## 4. Test end to end

1. In the admin console (`/admin`), toggle a client off. A `disable` row
   appears in the `commands` table with status `pending`.
2. Within ~60s the router pulls it, runs `/ppp secret disable`, kicks the
   active session, and confirms. The row becomes `acknowledged` and the
   client's status flips to `suspended`.
3. Toggle back on (or complete a PayMongo test payment) and confirm the
   reverse happens.
4. Check `usage` rows appear for active sessions after each poll.

You can also simulate the router from any machine:

```bash
curl -X POST "https://<REF>.supabase.co/functions/v1/router-sync/pull" \
  -H "Authorization: Bearer <ROUTER_SECRET>" -H "Content-Type: application/json" -d "{}"
```

## HTTPS certificate note

The script ships with `check-certificate=no` so the first install has no
certificate friction. For proper verification, import a root CA bundle and
flip `certCheck` to `"yes"`:

```routeros
/tool fetch url=https://curl.se/ca/cacert.pem
/certificate import file-name=cacert.pem passphrase=""
```

## Behavior details

- **Commands**: pulled max 20 per poll, oldest first. Each is confirmed
  individually with `{"id": "...", "result": "ok" | "fail"}`. Failed commands
  stay visible in the table with status `failed` for the admin to retry.
- **Usage counters**: RouterOS interface counters are cumulative per PPPoE
  session; the Edge Function overwrites today's `usage` row with the latest
  report (last write wins). Counters reset when a session reconnects.
- **Overdue auto-disable**: every pull, the Edge Function queues `disable`
  for active clients with a positive balance past their due date, so
  disconnection happens automatically without the app running any cron.
- **JSON stays flat** in both directions — RouterOS `:deserialize` handles
  flat objects and arrays reliably but chokes on deep nesting; keep it that
  way if you extend the contract.
