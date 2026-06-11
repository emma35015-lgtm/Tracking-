-- Esquema inicial de "Gastos"
-- Aplicar en el SQL Editor del dashboard de Supabase (o con `supabase db push`).

-- ============================================================
-- Tablas
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  default_currency text not null default 'MXN',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '🏷️',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index categories_user_idx on public.categories (user_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'MXN',
  merchant text,
  category_id uuid references public.categories (id) on delete set null,
  source text not null default 'manual' check (source in ('applepay', 'manual', 'siri')),
  occurred_at timestamptz not null default now(),
  note text,
  dedupe_key text,
  created_at timestamptz not null default now()
);

create index expenses_user_date_idx on public.expenses (user_id, occurred_at desc);
create unique index expenses_dedupe_idx on public.expenses (user_id, dedupe_key);

create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_normalized text not null,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, merchant_normalized)
);

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'iPhone',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index api_tokens_user_idx on public.api_tokens (user_id);

-- ============================================================
-- Row Level Security: cada usuario solo ve y toca lo suyo.
-- /api/ingest usa la service-role key (ignora RLS) tras validar el token.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.merchant_rules enable row level security;
alter table public.api_tokens enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own merchant_rules" on public.merchant_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own api_tokens" on public.api_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Al registrarse un usuario: crear perfil + categorías default en español
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);

  insert into public.categories (user_id, name, icon, is_default) values
    (new.id, 'Comida',          '🌮', true),
    (new.id, 'Supermercado',    '🛒', true),
    (new.id, 'Transporte',      '🚗', true),
    (new.id, 'Hogar',           '🏠', true),
    (new.id, 'Salud',           '💊', true),
    (new.id, 'Entretenimiento', '🎬', true),
    (new.id, 'Ropa',            '👕', true),
    (new.id, 'Suscripciones',   '📺', true),
    (new.id, 'Viajes',          '✈️', true),
    (new.id, 'Otros',           '🏷️', true);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
