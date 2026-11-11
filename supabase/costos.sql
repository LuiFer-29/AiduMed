-- Aidú Med · Panel de costos y uso (nov. 2026).

-- A qué médico corresponde cada mensaje y si fue plantilla o mensaje de servicio (para estimar costos).
alter table public.mensajes add column if not exists medico_id uuid references public.medicos(id) on delete set null;
alter table public.mensajes add column if not exists tipo text;
create index if not exists mensajes_creado on public.mensajes (creado_at);

-- Consumo de la IA (tokens y costo en USD por consulta).
create table if not exists public.ia_uso (
  id bigserial primary key,
  medico_id uuid references public.medicos(id) on delete set null,
  modelo text,
  tokens_entrada integer not null default 0,
  tokens_salida integer not null default 0,
  costo_usd numeric(12, 6) not null default 0,
  creado_at timestamptz not null default now()
);
alter table public.ia_uso enable row level security;
drop policy if exists "ia_uso: admin" on public.ia_uso;
create policy "ia_uso: admin" on public.ia_uso for select using (public.es_admin());

-- Gastos operativos que registra el administrador (montos en USD).
create table if not exists public.gastos (
  id bigserial primary key,
  fecha date not null default current_date,
  concepto text not null,
  categoria text,
  monto_usd numeric(12, 2) not null default 0,
  mensual boolean not null default false,   -- se repite cada mes desde "fecha"
  hasta date,                               -- último mes en que se cobra (si es mensual)
  notas text,
  creado_at timestamptz not null default now()
);
alter table public.gastos enable row level security;
drop policy if exists "gastos: admin" on public.gastos;
create policy "gastos: admin" on public.gastos for all using (public.es_admin()) with check (public.es_admin());

-- Ajustes del panel (tasa de cambio, tarifa de WhatsApp…).
create table if not exists public.ajustes (
  clave text primary key,
  valor jsonb not null,
  actualizado_at timestamptz not null default now()
);
alter table public.ajustes enable row level security;
drop policy if exists "ajustes: admin" on public.ajustes;
create policy "ajustes: admin" on public.ajustes for all using (public.es_admin()) with check (public.es_admin());
insert into public.ajustes (clave, valor) values
  ('tasa_hnl', '26.5'::jsonb),
  ('tarifa_whatsapp_usd', '0.0113'::jsonb)
on conflict (clave) do nothing;

-- Recordatorios enviados a quienes no terminan su registro.
create table if not exists public.registro_recordatorios (
  id bigserial primary key,
  user_id uuid not null,
  enviado_at timestamptz not null default now()
);
alter table public.registro_recordatorios enable row level security;
drop policy if exists "registro_recordatorios: admin" on public.registro_recordatorios;
create policy "registro_recordatorios: admin" on public.registro_recordatorios for select using (public.es_admin());
