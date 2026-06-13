-- Presupuesto mensual opcional por usuario.
-- Aplicar en el SQL Editor de Supabase (es seguro correrlo varias veces).

alter table public.profiles
  add column if not exists monthly_budget numeric(12, 2);
