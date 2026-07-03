-- PIXL Internet Service — router command queue
-- The app (webhook, admin console, overdue logic) enqueues PPPoE actions here;
-- the MikroTik router drains the queue through the router-sync Edge Function.
-- No VPS bridge: the router polls outbound over HTTPS, which works behind CGNAT.

create table if not exists public.commands (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  pppoe_user text not null,
  action text not null check (action in ('enable', 'disable')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'acknowledged', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists commands_status_idx on public.commands (status);
create index if not exists commands_client_id_idx on public.commands (client_id);

-- RLS: admins manage the queue from the app. The router never touches this
-- table directly — it only talks to the router-sync Edge Function, which uses
-- the service role (bypasses RLS) and authenticates the router with
-- ROUTER_SECRET.
alter table public.commands enable row level security;

create policy "commands_admin_all" on public.commands
  for all using (public.is_admin()) with check (public.is_admin());
