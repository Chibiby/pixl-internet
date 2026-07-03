# Production Setup Walkthrough

Follow these parts in order. Everything here happens in provider dashboards or
your terminal — no code changes needed. Budget roughly an hour end to end.

---

## Part 1 — Supabase (database + auth)

### 1.1 Create the project

1. Sign in at [supabase.com](https://supabase.com) → **New project**.
2. Organization: personal is fine. Name: `pixl-internet`.
3. Region: **Southeast Asia (Singapore)** — closest to the Philippines.
4. Generate a strong database password and store it in a password manager.

### 1.2 Run the schema and seed

1. Open **SQL Editor** → New query.
2. Paste and run, in this order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_commands.sql`
   - `supabase/seed.sql` (sample plans/clients/payments/usage so dashboards render)
3. Confirm in **Table Editor** that `plans`, `clients`, `payments`, `usage`,
   `commands`, and `profiles` exist, and `plans` has PIXL BASIC (₱500) and
   PIXL PRO (₱800).

### 1.3 Collect the keys

**Project Settings → API**. You need three values (they go into Vercel in Part 2):

| Env var | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — server-only, never in client code or on the router |

### 1.4 Auth providers

1. **Authentication → Providers → Email**: leave enabled. Keep
   "Confirm email" on for production.
2. **Google**: create an OAuth client at
   [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   (type: Web application). Authorized redirect URI = the **callback URL shown
   in Supabase's Google provider panel** (`https://<ref>.supabase.co/auth/v1/callback`).
   Paste the client ID/secret into Supabase and enable the provider.
3. **Facebook**: create an app at
   [developers.facebook.com](https://developers.facebook.com) → add
   **Facebook Login** → set the same Supabase callback URL as a Valid OAuth
   Redirect URI. Paste app ID/secret into Supabase and enable.
4. **Authentication → URL Configuration**: set **Site URL** to your production
   URL (after Part 2), and add `https://<your-domain>/auth/callback` plus
   `http://localhost:3000/auth/callback` to **Redirect URLs**.

### 1.5 Make yourself admin

1. Sign up once through the app (any method).
2. **Authentication → Users** → copy your user UUID.
3. SQL Editor:

```sql
update public.profiles set role = 'admin' where id = '<your-user-uuid>';
```

### 1.6 Link real clients to logins

When a client signs up, link their login to their billing record:

```sql
update public.clients set user_id = '<their-auth-uuid>'
where pppoe_username = '<their-pppoe-username>';
```

### 1.7 Deploy the router-sync Edge Function

From the repo root (install the [Supabase CLI](https://supabase.com/docs/guides/cli) first):

```bash
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
supabase functions deploy router-sync --no-verify-jwt
supabase secrets set ROUTER_SECRET=<long random string>   # e.g. openssl rand -hex 32
```

Verify with curl (expect a JSON `commands` array):

```bash
curl -X POST "https://<REF>.supabase.co/functions/v1/router-sync/pull" \
  -H "Authorization: Bearer <ROUTER_SECRET>" -H "Content-Type: application/json" -d "{}"
```

Router installation itself is covered in [../router/README.md](../router/README.md).

### 1.8 Verify RLS

- Sign in as a non-admin client: `/dashboard` shows only their data; `/admin`
  redirects away.
- Sign in as your admin user: `/admin` shows all clients.

---

## Part 2 — Vercel (hosting)

1. Sign in at [vercel.com](https://vercel.com) with GitHub → **Add New →
   Project** → import `Chibiby/pixl-internet`. Framework auto-detects Next.js;
   defaults are fine.
2. Before the first deploy, add **Environment Variables** (Production):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` — placeholder for now, fixed in step 4
   - `PAYMONGO_SECRET_KEY` and `PAYMONGO_WEBHOOK_SECRET` (from Part 3)
3. **Deploy** and note the assigned URL, e.g. `https://pixl-internet.vercel.app`.
4. Set `NEXT_PUBLIC_SITE_URL` to that exact URL and **redeploy**.
5. Go back to Supabase **Authentication → URL Configuration** and set the Site
   URL + redirect URLs to the Vercel domain (Part 1.4 step 4).
6. Sanity check: the deployed site must NOT show the amber "Demo mode" banner.
   If it does, an env var is missing or still a placeholder.
7. Custom domain (optional): Vercel → Settings → Domains, then update
   `NEXT_PUBLIC_SITE_URL`, Supabase URLs, and the PayMongo webhook to match.

---

## Part 3 — PayMongo (GCash / QR Ph payments)

### 3.1 Test keys first

1. Sign in at [dashboard.paymongo.com](https://dashboard.paymongo.com) and
   stay in **Test mode**.
2. **Developers → API Keys** → copy the secret key (`sk_test_...`) →
   Vercel env `PAYMONGO_SECRET_KEY`.

### 3.2 Webhook

1. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-vercel-domain>/api/webhooks/paymongo`
   - Event: `checkout_session.payment.paid`
2. Copy the signing secret (`whsk_...`) → Vercel env `PAYMONGO_WEBHOOK_SECRET`.
3. Redeploy so the new env vars take effect.

### 3.3 End-to-end test

1. Sign in as a client whose `clients.balance > 0` (seed client "Maria Santos"
   has ₱800 due — link her row to a test login per Part 1.6).
2. Dashboard → **Pay now** → complete the GCash test payment on the PayMongo
   hosted page.
3. You're redirected to `/payment/return`; within seconds the webhook should:
   - mark the payment `paid` (visible in payment history with a receipt link),
   - zero the balance and advance the due date one month,
   - set the client **Active**,
   - insert an `enable` row in the `commands` table for the router.
4. Check **Developers → Webhooks → your endpoint** for a `200` delivery. A
   `401` means the signing secret in Vercel doesn't match.

### 3.4 Go live

Only after test payments work: activate your PayMongo account (business
verification), switch the dashboard to Live mode, replace both env vars with
the live key + a live-mode webhook secret, and redeploy.

---

## Launch checklist

- [ ] Supabase project created, migrations + seed run
- [ ] Google + Facebook providers enabled with correct callback URLs
- [ ] Admin role set on your own user
- [ ] `router-sync` deployed with `ROUTER_SECRET`; curl test returns JSON
- [ ] Vercel deployed with all env vars; no demo-mode banner
- [ ] Supabase Site URL / redirect URLs point at the production domain
- [ ] PayMongo test payment completes the full webhook flow
- [ ] Router script installed and scheduler running (see router/README.md)
- [ ] Real clients linked via `clients.user_id`
- [ ] Switched PayMongo to live keys
