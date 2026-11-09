-- Aidú Med · Asistente de WhatsApp: pacientes, citas, conversaciones.
-- Se ejecuta una vez en el editor SQL de Supabase. Todo lo escribe la función "asistente" con la clave de servicio;
-- los médicos solo leen sus citas y las gestionan con las funciones de abajo.

create extension if not exists btree_gist;

-- Código corto por médico (va en su enlace de WhatsApp: "…(código IB24)").
alter table public.medicos add column if not exists codigo text unique;

create or replace function public.generar_codigo(nombre text) returns text
language plpgsql as $$
declare
  limpio text := trim(regexp_replace(translate(upper(coalesce(nombre, '')), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'), '[^A-Z ]', ' ', 'g'));
  ini text := left(split_part(limpio, ' ', 1), 1) || left(split_part(regexp_replace(limpio, '\s+', ' ', 'g'), ' ', 2), 1);
  cand text;
begin
  if length(ini) < 2 then ini := rpad(coalesce(nullif(ini, ''), 'A'), 2, 'M'); end if;
  loop
    cand := ini || lpad((floor(random() * 90) + 10)::text, 2, '0');
    exit when not exists (select 1 from public.medicos where codigo = cand);
  end loop;
  return cand;
end $$;

create or replace function public.medicos_asignar_codigo() returns trigger
language plpgsql as $$
begin
  if new.codigo is null and new.estado in ('aprobado', 'activo') then
    new.codigo := public.generar_codigo(new.nombre);
  end if;
  return new;
end $$;
drop trigger if exists medicos_codigo on public.medicos;
create trigger medicos_codigo before insert or update on public.medicos
  for each row execute function public.medicos_asignar_codigo();
update public.medicos set codigo = public.generar_codigo(nombre) where codigo is null and estado in ('aprobado', 'activo');

-- Pacientes (identificados por su número de WhatsApp).
create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  telefono text not null unique,          -- formato de WhatsApp, sin "+": 50499998888
  nombre text,
  creado_at timestamptz not null default now()
);

-- Citas.
create table if not exists public.citas (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid not null references public.medicos(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  nombre_paciente text,                   -- puede ser otra persona (p. ej. un hijo)
  servicio text not null,
  duracion_min int not null,
  precio int,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada', 'completada', 'no_asistio')),
  cancelada_por text check (cancelada_por in ('paciente', 'consultorio')),
  reagendada_de uuid references public.citas(id),
  recordatorio_at timestamptz,
  paciente_confirmo_at timestamptz,
  creada_at timestamptz not null default now(),
  actualizada_at timestamptz not null default now(),
  constraint citas_sin_cruce exclude using gist (medico_id with =, tstzrange(inicio, fin) with &&) where (estado = 'confirmada')
);
create index if not exists citas_medico_inicio on public.citas (medico_id, inicio);
create index if not exists citas_paciente on public.citas (paciente_id, inicio);

-- Estado de cada conversación de WhatsApp (en qué paso va el paciente).
create table if not exists public.conversaciones (
  telefono text primary key,
  medico_id uuid references public.medicos(id) on delete set null,
  paso text not null default 'inicio',
  datos jsonb not null default '{}'::jsonb,
  ultimo_mensaje_at timestamptz,          -- último mensaje del paciente (ventana de 24 h de Meta)
  actualizada_at timestamptz not null default now()
);

-- Registro de mensajes (para revisar conversaciones y depurar). Se puede limpiar cada 90 días.
create table if not exists public.mensajes (
  id bigint generated always as identity primary key,
  telefono text not null,
  direccion text not null check (direccion in ('entrante', 'saliente')),
  contenido jsonb not null,
  meta_id text,
  creado_at timestamptz not null default now()
);
create index if not exists mensajes_telefono on public.mensajes (telefono, creado_at desc);

-- Feriados con fecha variable que fija el administrador cada año (p. ej. Semana Morazánica).
create table if not exists public.feriados (
  id bigint generated always as identity primary key,
  nombre text not null,
  desde date not null,
  hasta date not null
);

-- Médicos interesados que escriben al número del asistente.
create table if not exists public.prospectos (
  id bigint generated always as identity primary key,
  telefono text not null,
  nombre text,
  mensaje text,
  creado_at timestamptz not null default now()
);

-- Seguridad: nadie anónimo ve nada. El médico ve sus citas y a sus pacientes; el administrador ve todo.
alter table public.pacientes enable row level security;
alter table public.citas enable row level security;
alter table public.conversaciones enable row level security;
alter table public.mensajes enable row level security;
alter table public.feriados enable row level security;
alter table public.prospectos enable row level security;

drop policy if exists citas_ver on public.citas;
create policy citas_ver on public.citas for select to authenticated
  using (medico_id = auth.uid() or public.es_admin());

drop policy if exists pacientes_ver on public.pacientes;
create policy pacientes_ver on public.pacientes for select to authenticated
  using (public.es_admin() or exists (select 1 from public.citas c where c.paciente_id = pacientes.id and c.medico_id = auth.uid()));

drop policy if exists conversaciones_admin on public.conversaciones;
create policy conversaciones_admin on public.conversaciones for select to authenticated using (public.es_admin());
drop policy if exists mensajes_admin on public.mensajes;
create policy mensajes_admin on public.mensajes for select to authenticated using (public.es_admin());
drop policy if exists prospectos_admin on public.prospectos;
create policy prospectos_admin on public.prospectos for select to authenticated using (public.es_admin());

drop policy if exists feriados_ver on public.feriados;
create policy feriados_ver on public.feriados for select to authenticated using (true);
drop policy if exists feriados_admin on public.feriados;
create policy feriados_admin on public.feriados for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- El médico cancela una cita desde Mi perfil (el asistente avisa al paciente).
create or replace function public.cancelar_cita(p_cita uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.citas set estado = 'cancelada', cancelada_por = 'consultorio', actualizada_at = now()
  where id = p_cita and estado = 'confirmada' and (medico_id = auth.uid() or public.es_admin());
  if not found then raise exception 'No se encontró la cita o ya no se puede cancelar'; end if;
end $$;
revoke all on function public.cancelar_cita(uuid) from public, anon;
grant execute on function public.cancelar_cita(uuid) to authenticated;

-- El médico marca si el paciente llegó o no.
create or replace function public.marcar_cita(p_cita uuid, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_estado not in ('completada', 'no_asistio') then raise exception 'Estado no válido'; end if;
  update public.citas set estado = p_estado, actualizada_at = now()
  where id = p_cita and (medico_id = auth.uid() or public.es_admin()) and inicio < now();
  if not found then raise exception 'No se encontró la cita'; end if;
end $$;
revoke all on function public.marcar_cita(uuid, text) from public, anon;
grant execute on function public.marcar_cita(uuid, text) to authenticated;

-- La Semana Morazánica de cada año se agrega aquí cuando el gobierno publica las fechas oficiales.
