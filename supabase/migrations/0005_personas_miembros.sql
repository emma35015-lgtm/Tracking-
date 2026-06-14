-- 0005: Ligar miembros con la lista de personas del viaje.
-- Así el creador y cada miembro aparecen por su nombre automáticamente
-- y pueden registrar sus propias aportaciones sin agregarse a mano.
-- Aplicar en el SQL Editor de Supabase.

alter table public.trip_people
  add column user_id uuid references auth.users (id) on delete set null;

-- Un miembro = una sola persona ligada por viaje
create unique index trip_people_trip_user_idx
  on public.trip_people (trip_id, user_id) where user_id is not null;

-- Backfill: crea una persona ligada para cada miembro que aún no tenga una.
-- El nombre sale del perfil; si está vacío, usa la parte local del correo.
insert into public.trip_people (trip_id, name, user_id)
  select m.trip_id,
         coalesce(nullif(trim(m.display_name), ''), split_part(u.email, '@', 1), 'Miembro'),
         m.user_id
  from public.trip_members m
  join auth.users u on u.id = m.user_id
  where not exists (
    select 1 from public.trip_people p
    where p.trip_id = m.trip_id and p.user_id = m.user_id
  );
