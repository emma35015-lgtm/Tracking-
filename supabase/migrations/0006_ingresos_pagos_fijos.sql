-- 0006: Ingresos mensuales y pagos fijos (suscripciones, meses sin intereses
-- y recordatorio de pago de tarjeta de crédito).
-- Aplicar en el SQL Editor de Supabase (es seguro correrlo más de una vez).

-- Cuánto recibe el usuario al mes. Opcional; vacío = no se muestra el "disponible".
alter table public.profiles
  add column if not exists monthly_income numeric(12, 2);

-- Un solo lugar para todo lo que se repite cada mes:
--   subscription → monto fijo, indefinido (Netflix, Spotify…)
--   installment  → compra a meses, con fin (total_months desde start_date)
--   card         → recordatorio del pago de la tarjeta (monto opcional/variable)
create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('subscription', 'installment', 'card')),
  name text not null,
  amount numeric(12, 2) check (amount is null or amount > 0),
  currency text not null default 'MXN',
  day_of_month int not null check (day_of_month between 1 and 31),
  category_id uuid references public.categories (id) on delete set null,
  total_months int check (total_months is null or total_months > 0),
  start_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists recurring_payments_user_idx
  on public.recurring_payments (user_id);

alter table public.recurring_payments enable row level security;

drop policy if exists "own recurring_payments" on public.recurring_payments;
create policy "own recurring_payments" on public.recurring_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
