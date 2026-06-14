-- 0004: Viajes colaborativos — invitar amigos con el mismo link para compartir.
-- Cada miembro agrega sus gastos; solo su autor (o el dueño) puede editarlos.
-- Aplicar en el SQL Editor de Supabase.

-- ============================================================
-- 1) Miembros del viaje (incluye al dueño con rol 'owner')
-- ============================================================
create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  display_name text,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);
create index trip_members_trip_idx on public.trip_members (trip_id);
create index trip_members_user_idx on public.trip_members (user_id);

-- ============================================================
-- 2) Quién agregó cada cosa (para editar solo lo propio)
-- ============================================================
alter table public.trip_expenses
  add column added_by uuid references auth.users (id) on delete set null;
alter table public.trip_contributions
  add column added_by uuid references auth.users (id) on delete set null;

-- ============================================================
-- 3) Funciones auxiliares SECURITY DEFINER.
--    Corren como su dueño (ignoran RLS) → evitan la recursión
--    "trips depende de members, members depende de trips".
-- ============================================================
create or replace function public.is_trip_member(_trip_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = _trip_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_owner(_trip_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.trips t
    where t.id = _trip_id and t.user_id = auth.uid()
  );
$$;

grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.is_trip_owner(uuid) to authenticated;

-- ============================================================
-- 4) Backfill de datos existentes
-- ============================================================
-- El dueño actual de cada viaje queda como miembro 'owner'.
insert into public.trip_members (trip_id, user_id, role, display_name)
  select t.id, t.user_id, 'owner', p.display_name
  from public.trips t
  left join public.profiles p on p.id = t.user_id
  on conflict (trip_id, user_id) do nothing;

-- Los gastos/aportaciones que ya existían se atribuyen al dueño.
update public.trip_expenses te set added_by = t.user_id
  from public.trips t where t.id = te.trip_id and te.added_by is null;
update public.trip_contributions tc set added_by = t.user_id
  from public.trips t where t.id = tc.trip_id and tc.added_by is null;

-- ============================================================
-- 5) RLS: reemplazar "solo el dueño" por "dueño o miembro"
-- ============================================================
alter table public.trip_members enable row level security;

drop policy if exists "own trips" on public.trips;
drop policy if exists "own trip_people" on public.trip_people;
drop policy if exists "own trip_contributions" on public.trip_contributions;
drop policy if exists "own trip_expenses" on public.trip_expenses;

-- trips: ven dueño y miembros; solo el dueño edita/borra el viaje
create policy "trips_select" on public.trips for select
  using (auth.uid() = user_id or public.is_trip_member(id));
create policy "trips_insert" on public.trips for insert
  with check (auth.uid() = user_id);
create policy "trips_update" on public.trips for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trips_delete" on public.trips for delete
  using (auth.uid() = user_id);

-- trip_members: los miembros se ven entre sí; cada quien se une/sale solo
create policy "members_select" on public.trip_members for select
  using (public.is_trip_member(trip_id) or public.is_trip_owner(trip_id));
create policy "members_insert_self" on public.trip_members for insert
  with check (user_id = auth.uid());
create policy "members_delete" on public.trip_members for delete
  using (user_id = auth.uid() or public.is_trip_owner(trip_id));

-- trip_people: la lista de quién va es compartida; cualquier miembro la edita
create policy "people_all" on public.trip_people for all
  using (public.is_trip_member(trip_id) or public.is_trip_owner(trip_id))
  with check (public.is_trip_member(trip_id) or public.is_trip_owner(trip_id));

-- trip_contributions: todos ven; agregas como tú; editas/borras solo lo tuyo (o el dueño)
create policy "contrib_select" on public.trip_contributions for select
  using (public.is_trip_member(trip_id) or public.is_trip_owner(trip_id));
create policy "contrib_insert" on public.trip_contributions for insert
  with check ((public.is_trip_member(trip_id) or public.is_trip_owner(trip_id)) and added_by = auth.uid());
create policy "contrib_update" on public.trip_contributions for update
  using (added_by = auth.uid() or public.is_trip_owner(trip_id))
  with check (added_by = auth.uid() or public.is_trip_owner(trip_id));
create policy "contrib_delete" on public.trip_contributions for delete
  using (added_by = auth.uid() or public.is_trip_owner(trip_id));

-- trip_expenses: igual que las aportaciones
create policy "expense_select" on public.trip_expenses for select
  using (public.is_trip_member(trip_id) or public.is_trip_owner(trip_id));
create policy "expense_insert" on public.trip_expenses for insert
  with check ((public.is_trip_member(trip_id) or public.is_trip_owner(trip_id)) and added_by = auth.uid());
create policy "expense_update" on public.trip_expenses for update
  using (added_by = auth.uid() or public.is_trip_owner(trip_id))
  with check (added_by = auth.uid() or public.is_trip_owner(trip_id));
create policy "expense_delete" on public.trip_expenses for delete
  using (added_by = auth.uid() or public.is_trip_owner(trip_id));
