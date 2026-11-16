-- Aidú Med · Acceso de la asistente o secretaria del médico (plan Profesional).
-- La asistente entra con su propio correo y contraseña y solo maneja «Mis citas» del médico:
-- ver citas, «Atender», marcar si el paciente asistió y cancelar citas una por una.
-- No puede cancelar días completos, ni tocar vacaciones, horarios, perfil o plan.
-- Ejecutar completo en el editor SQL de Supabase (se puede repetir sin problema).

create table if not exists public.asistentes (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid not null references public.medicos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  nombre text not null,
  correo text not null,
  whatsapp text,
  recibe_derivaciones boolean not null default true,
  estado text not null default 'invitada' check (estado in ('invitada', 'activa', 'revocada')),
  creado_at timestamptz not null default now(),
  ultimo_acceso timestamptz,
  revocado_at timestamptz
);
create index if not exists asistentes_medico on public.asistentes (medico_id) where estado <> 'revocada';
create index if not exists asistentes_usuario on public.asistentes (user_id) where estado <> 'revocada';
alter table public.asistentes enable row level security;

-- El médico ve las suyas y la asistente ve su propio acceso. Crear, quitar y reenviar
-- se hace desde la función del panel (con la clave de servicio), nunca directo desde el navegador.
drop policy if exists "asistentes: medico o ella misma" on public.asistentes;
create policy "asistentes: medico o ella misma" on public.asistentes for select to authenticated
  using (medico_id = auth.uid() or user_id = auth.uid() or public.es_admin());

-- Quién hizo cada acción cuando no fue el médico (para mostrar «Avisado por Carla»).
alter table public.citas add column if not exists llamado_por text;
alter table public.citas add column if not exists marcada_por text;
alter table public.citas add column if not exists cancelada_por_nombre text;

-- ¿La persona con sesión es asistente vigente de este médico? Solo cuenta si el médico está en plan Profesional
-- (o Piloto fundador, que incluye todo lo del Profesional): si baja de plan, el acceso se corta solo.
create or replace function public.es_asistente_de(p_medico uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.asistentes a join public.medicos m on m.id = a.medico_id
    where a.medico_id = p_medico and a.user_id = auth.uid() and a.estado <> 'revocada'
      and m.plan in ('Profesional', 'Piloto fundador'));
$$;
revoke all on function public.es_asistente_de(uuid) from public, anon;
grant execute on function public.es_asistente_de(uuid) to authenticated;

-- Nombre de la asistente con sesión para ese médico (null si es el propio médico).
create or replace function public.nombre_asistente(p_medico uuid) returns text
language sql stable security definer set search_path = public as $$
  select a.nombre from public.asistentes a
  where a.medico_id = p_medico and a.user_id = auth.uid() and a.estado <> 'revocada'
    and p_medico <> auth.uid()
  limit 1;
$$;
revoke all on function public.nombre_asistente(uuid) from public, anon;
grant execute on function public.nombre_asistente(uuid) to authenticated;

-- Citas y pacientes: además del médico y el administrador, la asistente vigente.
drop policy if exists citas_ver on public.citas;
create policy citas_ver on public.citas for select to authenticated
  using (medico_id = auth.uid() or public.es_admin() or public.es_asistente_de(medico_id));

drop policy if exists pacientes_ver on public.pacientes;
create policy pacientes_ver on public.pacientes for select to authenticated
  using (public.es_admin() or exists (
    select 1 from public.citas c where c.paciente_id = pacientes.id
      and (c.medico_id = auth.uid() or public.es_asistente_de(c.medico_id))));

-- Cancelar una cita: médico, administrador o asistente. (Los días completos siguen siendo solo del médico.)
create or replace function public.cancelar_cita(p_cita uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_medico uuid;
begin
  select medico_id into v_medico from public.citas where id = p_cita;
  if v_medico is null or not (v_medico = auth.uid() or public.es_admin() or public.es_asistente_de(v_medico)) then
    raise exception 'No se encontró la cita o ya no se puede cancelar';
  end if;
  update public.citas set estado = 'cancelada', cancelada_por = 'consultorio',
    cancelada_por_nombre = public.nombre_asistente(v_medico), actualizada_at = now()
  where id = p_cita and estado = 'confirmada';
  if not found then raise exception 'No se encontró la cita o ya no se puede cancelar'; end if;
end $$;
revoke all on function public.cancelar_cita(uuid) from public, anon;
grant execute on function public.cancelar_cita(uuid) to authenticated;

-- Marcar si el paciente asistió: médico, administrador o asistente.
create or replace function public.marcar_cita(p_cita uuid, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
declare v_medico uuid;
begin
  if p_estado not in ('completada', 'no_asistio') then raise exception 'Estado no válido'; end if;
  select medico_id into v_medico from public.citas where id = p_cita;
  if v_medico is null or not (v_medico = auth.uid() or public.es_admin() or public.es_asistente_de(v_medico)) then
    raise exception 'No se encontró la cita';
  end if;
  update public.citas set estado = p_estado, marcada_por = public.nombre_asistente(v_medico), actualizada_at = now()
  where id = p_cita and inicio < now();
  if not found then raise exception 'No se encontró la cita'; end if;
end $$;
revoke all on function public.marcar_cita(uuid, text) from public, anon;
grant execute on function public.marcar_cita(uuid, text) to authenticated;

-- Para la función del panel: encontrar una cuenta existente por correo (solo con la clave de servicio).
create or replace function public.usuario_por_correo(p_correo text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(p_correo) limit 1;
$$;
revoke all on function public.usuario_por_correo(text) from public, anon, authenticated;
grant execute on function public.usuario_por_correo(text) to service_role;

-- Las cuentas de asistentes no son registros incompletos de médicos: se excluyen de esa lista del administrador.
create or replace function public.cuentas_sin_registro()
returns table (id uuid, correo text, creada timestamptz, confirmada boolean)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, u.created_at, u.email_confirmed_at is not null
  from auth.users u
  where public.es_admin()
    and not exists (select 1 from public.medicos m where m.id = u.id)
    and not exists (select 1 from public.admins a where a.user_id = u.id)
    and not exists (select 1 from public.asistentes s where s.user_id = u.id)
  order by u.created_at desc;
$$;
revoke all on function public.cuentas_sin_registro() from public, anon;
grant execute on function public.cuentas_sin_registro() to authenticated;
