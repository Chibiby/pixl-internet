# PIXL Internet Service

Client billing portal for a fiber-sharing ISP in the Philippines. Built with
Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase, and
PayMongo — with a dark neon gaming aesthetic to match the PIXL brand.

## Features

- **Landing page** with plan pricing (PIXL BASIC ₱500/mo, PIXL PRO ₱800/mo)
- **Client dashboard** (`/dashboard`): plan, glowing Active/Suspended/Overdue
  status, balance, next due date, daily + monthly bandwidth charts, payment
  history with receipts, and a Pay Now button (PayMongo Hosted Checkout —
  GCash / QR Ph)
- **Admin console** (`/admin`): metrics cards (clients, active, suspended,
  overdue, monthly revenue), client CRUD, plan assignment, and per-client
  Enable/Disable connection toggle
- **Auth**: Google, Facebook, and email/password via Supabase, with a separate
  admin role enforced by proxy (middleware) + RLS
- **Billing**: monthly due dates, overdue detection, PayMongo webhook that
  marks payments paid, reactivates the client, and re-enables PPPoE
- **Router bridge stub**: `POST /api/router/toggle` forwards
  `{ pppoeUser, action }` to `BRIDGE_URL` (the MikroTik bridge on the VPS) —
  a logged no-op until the bridge exists

## Demo mode

With placeholder env values the app runs in **demo mode**: dashboards render
seeded in-memory data, auth is bypassed, and checkout simulates the redirect
flow. This lets you develop the UI with zero setup.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in real values when ready
npm run dev                        # http://localhost:3000
```

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then
   `supabase/seed.sql` (sample clients, payments, and usage).
   Or with the CLI: `supabase db push` and `supabase db seed`.
3. Copy the project URL and anon key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`), plus the
   service role key (`SUPABASE_SERVICE_ROLE_KEY`).
4. **OAuth**: In Authentication → Providers, enable Google and Facebook and
   add their client IDs/secrets. Set the redirect URL to
   `https://<your-domain>/auth/callback` (and the Supabase callback URL in
   Google/Facebook consoles).
5. **Make yourself admin**: after signing up once, run
   `update public.profiles set role = 'admin' where id = '<your-user-uuid>';`
6. **Link a client to a login**: set `clients.user_id` to the auth user's id
   (from the Auth → Users page) so their dashboard shows real data.

## PayMongo setup

1. Get test keys from the [PayMongo dashboard](https://dashboard.paymongo.com)
   → Developers → API Keys, and set `PAYMONGO_SECRET_KEY` (`sk_test_...`).
2. Create a webhook (Developers → Webhooks) pointing to
   `https://<your-domain>/api/webhooks/paymongo` with the
   `checkout_session.payment.paid` event, and put its signing secret in
   `PAYMONGO_WEBHOOK_SECRET`.
3. For local webhook testing, tunnel with `ngrok http 3000` and use the ngrok
   URL in the webhook config.

## MikroTik bridge (later)

When the bridge service on the AWS VPS is ready, set `BRIDGE_URL` (and
optionally `BRIDGE_API_KEY`). The app will POST
`{ "pppoeUser": "...", "action": "enable" | "disable" }` to
`<BRIDGE_URL>/pppoe/toggle`. Until then the route logs and no-ops.

## Deploy to Vercel

```bash
npm i -g vercel
vercel          # link the repo, first deploy
vercel --prod   # production deploy (free .vercel.app URL)
```

Or import the GitHub repo at [vercel.com/new](https://vercel.com/new). Then:

1. Add all vars from `.env.local.example` in Project → Settings →
   Environment Variables.
2. Set `NEXT_PUBLIC_SITE_URL` to the assigned URL
   (e.g. `https://pixl-internet.vercel.app`).
3. Update the Supabase auth redirect URLs and the PayMongo webhook URL to the
   production domain.

## Project structure

```
src/
  app/                 # routes: /, /login, /dashboard, /admin, /receipt/[id],
                       # /payment/return, /api/{checkout,webhooks/paymongo,router/toggle}
  components/          # UI: charts, tables, badges, admin CRUD dialogs
  lib/                 # supabase clients, data layer (+ demo fallback),
                       # paymongo, bridge stub, formatting
  proxy.ts             # session refresh + route protection (Next 16 proxy)
supabase/
  migrations/          # schema + RLS policies
  seed.sql             # sample plans/clients/payments/usage
```

Replace `public/logo.png` with the final PIXL logo whenever ready.
