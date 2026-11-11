-- Aidú Med · Mejoras del panel del médico (nov. 2026).
-- Número de consultorio, foto con aprobación, "Atender" y cancelar un día completo.
-- Se ejecuta una vez en el SQL Editor (reemplazando <AVISO_SECRETO>).

-- Número o código del consultorio dentro de la clínica (p. ej. "204"). Opcional.
alter table public.medicos add column if not exists numero_consultorio text;

-- Foto nueva en espera de aprobación del administrador.
alter table public.medicos add column if not exists foto_pendiente_path text;
alter table public.medicos add column if not exists foto_rechazada_at timestamptz;

-- Cuándo se avisó al paciente que el médico está listo para atenderle.
alter table public.citas add column if not exists llamado_at timestamptz;

-- Reglas de edición del médico: además de lo anterior, una vez aprobado su registro,
-- la foto nueva queda pendiente y solo el administrador la publica.
create or replace function public.medicos_al_editar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.id := old.id;
  new.correo := old.correo;
  new.created_at := old.created_at;
  if public.es_admin() then
    if old.id <> auth.uid() then
      if new.estado is distinct from old.estado then new.revisado_at := now(); end if;
      return new;
    end if;
  elsif old.estado in ('aprobado', 'activo', 'pausado') then
    if new.foto_path is distinct from old.foto_path then
      new.foto_pendiente_path := new.foto_path;
      new.foto_path := old.foto_path;
    end if;
  end if;
  if not public.es_admin() then
    if new.foto_pendiente_path is distinct from old.foto_pendiente_path and new.foto_pendiente_path is not null then
      new.foto_rechazada_at := null;
    else
      new.foto_rechazada_at := old.foto_rechazada_at;
    end if;
  end if;
  if new.estado is distinct from old.estado then
    if old.estado in ('borrador', 'rechazado') and new.estado = 'en_revision' then
      new.enviado_at := now();
    else
      new.estado := old.estado;
    end if;
  end if;
  new.nota_admin := old.nota_admin;
  new.revisado_at := old.revisado_at;
  return new;
end $$;

-- Correo al administrador cuando un médico sube una foto nueva.
create or replace function public.medicos_avisar_foto() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.foto_pendiente_path is not null and new.foto_pendiente_path is distinct from old.foto_pendiente_path then
    perform net.http_post(
      url := 'https://lpdtiyhcwubaryrrpxgw.supabase.co/functions/v1/asistente/evento',
      body := jsonb_build_object('tipo', 'foto_pendiente', 'medico_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso-secreto', '<AVISO_SECRETO>')
    );
  end if;
  return new;
end $$;
revoke all on function public.medicos_avisar_foto() from public, anon, authenticated;
drop trigger if exists medicos_avisar_foto on public.medicos;
create trigger medicos_avisar_foto after update on public.medicos for each row execute function public.medicos_avisar_foto();

-- Cancela todas las citas confirmadas de un día y lo deja como día libre.
-- Cada cancelación dispara el aviso al paciente (trigger citas_avisar → plantilla de cancelación).
create or replace function public.cancelar_dia(p_fecha date, p_motivo text default null) returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
  motivo text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  if auth.uid() is null then raise exception 'Inicie sesión de nuevo'; end if;
  if p_fecha < (now() at time zone 'America/Tegucigalpa')::date then raise exception 'Esa fecha ya pasó'; end if;
  update public.citas set estado = 'cancelada', cancelada_por = 'consultorio', actualizada_at = now()
  where medico_id = auth.uid() and estado = 'confirmada'
    and (inicio at time zone 'America/Tegucigalpa')::date = p_fecha
    and inicio > now();
  get diagnostics n = row_count;
  update public.medicos
  set otras_vacaciones = coalesce(otras_vacaciones, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('desde', p_fecha, 'hasta', p_fecha, 'motivo', motivo, 'origen', 'cerrado'))
  where id = auth.uid()
    and not exists (select 1 from jsonb_array_elements(coalesce(otras_vacaciones, '[]'::jsonb)) e
                    where (e->>'desde')::date <= p_fecha and coalesce(e->>'hasta', e->>'desde')::date >= p_fecha);
  return n;
end $$;
revoke all on function public.cancelar_dia(date, text) from public, anon;
grant execute on function public.cancelar_dia(date, text) to authenticated;

-- Anticipación mínima para agendar, en minutos (la elige cada médico; obligatoria en el registro).
alter table public.medicos add column if not exists aviso_minimo_min integer
  check (aviso_minimo_min in (30, 60, 120, 240, 1440));

-- Cancela las citas confirmadas (futuras) del médico entre dos fechas, sin tocar sus días libres.
-- Se usa al guardar vacaciones sobre fechas con citas y desde "Mis citas". Cada cancelación avisa al paciente.
create or replace function public.cancelar_citas_fechas(p_desde date, p_hasta date) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'Inicie sesión de nuevo'; end if;
  if p_hasta < p_desde then raise exception 'Fechas no válidas'; end if;
  update public.citas set estado = 'cancelada', cancelada_por = 'consultorio', actualizada_at = now()
  where medico_id = auth.uid() and estado = 'confirmada' and inicio > now()
    and (inicio at time zone 'America/Tegucigalpa')::date between p_desde and p_hasta;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.cancelar_citas_fechas(date, date) from public, anon;
grant execute on function public.cancelar_citas_fechas(date, date) to authenticated;

-- Pacientes que pidieron una especialidad que Aidú Med todavía no tiene ("Sí, avísame").
create table if not exists public.solicitudes_pacientes (
  id bigserial primary key,
  telefono text not null,
  especialidad text not null,
  avisado_at timestamptz,
  creado_at timestamptz not null default now()
);
alter table public.solicitudes_pacientes enable row level security;
drop policy if exists "solicitudes: admin lee" on public.solicitudes_pacientes;
create policy "solicitudes: admin lee" on public.solicitudes_pacientes for select using (public.es_admin());
