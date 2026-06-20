-- 0007: Color editable por categoría y por pago fijo.
-- Aplicar en el SQL Editor de Supabase (es seguro correrlo más de una vez).

alter table public.categories
  add column if not exists color text;

alter table public.recurring_payments
  add column if not exists color text;

-- Backfill: deja las categorías default con el color que ya mostraba la app,
-- para que aparezcan con su color en el selector y se puedan cambiar.
update public.categories set color = case name
  when 'Comida'          then '#FF6518'
  when 'Transporte'      then '#F4CF12'
  when 'Supermercado'    then '#A7D9BF'
  when 'Suscripciones'   then '#D995AF'
  when 'Salud'           then '#9EC8E0'
  when 'Entretenimiento' then '#C9B8E8'
  when 'Hogar'           then '#F2B79F'
  when 'Ropa'            then '#B8D9E8'
  when 'Viajes'          then '#9FD0C4'
  when 'Otros'           then '#D8CFB8'
  else color
end
where color is null;
