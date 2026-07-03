-- PIXL Internet Service — seed data
-- Run after migrations: plans, sample clients, payments, and 30 days of usage
-- so both dashboards render immediately.

-- Plans ----------------------------------------------------------------------
insert into public.plans (id, name, description, monthly_price) values
  ('11111111-1111-1111-1111-111111111111', 'PIXL BASIC', 'For households of 4–10 users', 500.00),
  ('22222222-2222-2222-2222-222222222222', 'PIXL PRO', 'For households of 10+ users', 800.00)
on conflict (name) do update
  set description = excluded.description,
      monthly_price = excluded.monthly_price;

-- Clients --------------------------------------------------------------------
-- user_id is null until a real auth user is linked (set it manually or from
-- the admin UI once clients sign up).
insert into public.clients (id, user_id, full_name, pppoe_username, plan_id, status, balance, due_date) values
  ('c1000000-0000-0000-0000-000000000001', null, 'Juan Dela Cruz', 'pixl-juandc',   '11111111-1111-1111-1111-111111111111', 'active',    0,    current_date + 12),
  ('c1000000-0000-0000-0000-000000000002', null, 'Maria Santos',   'pixl-msantos',  '22222222-2222-2222-2222-222222222222', 'active',    800,  current_date + 5),
  ('c1000000-0000-0000-0000-000000000003', null, 'Pedro Reyes',    'pixl-preyes',   '11111111-1111-1111-1111-111111111111', 'active',    500,  current_date - 6),
  ('c1000000-0000-0000-0000-000000000004', null, 'Ana Villanueva', 'pixl-avilla',   '22222222-2222-2222-2222-222222222222', 'suspended', 1600, current_date - 35),
  ('c1000000-0000-0000-0000-000000000005', null, 'Carlo Mendoza',  'pixl-cmendoza', '11111111-1111-1111-1111-111111111111', 'active',    0,    current_date + 20)
on conflict (pppoe_username) do nothing;

-- Payments -------------------------------------------------------------------
insert into public.payments (client_id, amount, method, status, paymongo_ref, paid_at) values
  ('c1000000-0000-0000-0000-000000000001', 500.00, 'gcash', 'paid',    'cs_demo_001', now() - interval '18 days'),
  ('c1000000-0000-0000-0000-000000000001', 500.00, 'gcash', 'paid',    'cs_demo_002', now() - interval '48 days'),
  ('c1000000-0000-0000-0000-000000000001', 500.00, 'qrph',  'paid',    'cs_demo_003', now() - interval '79 days'),
  ('c1000000-0000-0000-0000-000000000002', 800.00, 'gcash', 'pending', 'cs_demo_004', null),
  ('c1000000-0000-0000-0000-000000000003', 500.00, 'cash',  'paid',    null,          now() - interval '40 days'),
  ('c1000000-0000-0000-0000-000000000005', 500.00, 'gcash', 'paid',    'cs_demo_005', now() - interval '3 days');

-- Usage: 30 days of pseudo-random daily bandwidth for every client -----------
insert into public.usage (client_id, date, download_mb, upload_mb)
select
  c.id,
  d::date,
  (3000 + floor(random() * 9000) + case when extract(dow from d) in (0, 6) then 4000 else 0 end)::int,
  (600 + floor(random() * 2200) + case when extract(dow from d) in (0, 6) then 800 else 0 end)::int
from public.clients c
cross join generate_series(current_date - 29, current_date, interval '1 day') as d
on conflict (client_id, date) do nothing;
