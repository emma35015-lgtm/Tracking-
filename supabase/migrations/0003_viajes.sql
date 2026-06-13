-- Viajes / "botes" (la vaca): un fondo común que administra una persona.
-- Aplicar en el SQL Editor de Supabase.

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  currency text not null default 'MXN',
  share_token text not null unique,
  status text not null default 'activo' check (status in ('activo', 'cerrado')),
  created_at timestamptz not null default now()
);
create index trips_user_idx on public.trips (user_id);

create table public.trip_people (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index trip_people_trip_idx on public.trip_people (trip_id);

create table public.trip_contributions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  person_id uuid references public.trip_people (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index trip_contributions_trip_idx on public.trip_contributions (trip_id);

create table public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  concept text,
  amount numeric(12, 2) not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index trip_expenses_trip_idx on public.trip_expenses (trip_id);

-- RLS: el dueño maneja todo lo suyo. La vista pública por share_token
-- la sirve el servidor con la service-role key (no necesita políticas anon).
alter table public.trips enable row level security;
alter table public.trip_people enable row level security;
alter table public.trip_contributions enable row level security;
alter table public.trip_expenses enable row level security;

create policy "own trips" on public.trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Para las tablas hijas: el acceso depende de ser dueño del viaje padre.
create policy "own trip_people" on public.trip_people
  for all using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "own trip_contributions" on public.trip_contributions
  for all using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "own trip_expenses" on public.trip_expenses
  for all using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
