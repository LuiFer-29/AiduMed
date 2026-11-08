-- Aidú Med · esquema de base de datos (Supabase)
-- Ejecutar completo en el editor SQL del proyecto.

-- ---------- Tipos ----------
do $$ begin
  create type public.estado_medico as enum ('borrador', 'en_revision', 'aprobado', 'rechazado', 'activo', 'pausado');
exception when duplicate_object then null; end $$;

-- ---------- Administradores ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admin se ve a sí mismo" on public.admins;
create policy "admin se ve a sí mismo" on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.es_admin() to authenticated;

-- ---------- Médicos ----------
create table if not exists public.medicos (
  id uuid primary key references auth.users(id) on delete cascade,
  correo text,
  plan text,
  titulo text,
  nombre text,
  especialidad text,
  especialidad_otra text,
  colegiacion text,
  descripcion text,
  foto_path text,
  carne_path text,
  consultorio text,
  direccion text,
  ubicacion_gps text,
  whatsapp_consultorio text,
  telefono_consultorio text,
  derivar_a text,
  whatsapp_secretaria text,
  servicios jsonb not null default '[]'::jsonb,
  dias_atencion text[] not null default '{}',
  hora_desde time,
  hora_hasta time,
  tiempo_entre_citas text,
  anticipacion text,
  vacaciones text[] not null default '{}',
  otras_fechas text,
  conectar_google_calendar boolean not null default false,
  acepta_terminos_at timestamptz,
  estado public.estado_medico not null default 'borrador',
  nota_admin text,
  enviado_at timestamptz,
  revisado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.medicos enable row level security;

drop policy if exists "ver perfil propio o admin" on public.medicos;
create policy "ver perfil propio o admin" on public.medicos for select to authenticated
  using (id = auth.uid() or public.es_admin());
drop policy if exists "crear perfil propio" on public.medicos;
create policy "crear perfil propio" on public.medicos for insert to authenticated
  with check (id = auth.uid());
drop policy if exists "editar perfil propio o admin" on public.medicos;
create policy "editar perfil propio o admin" on public.medicos for update to authenticated
  using (id = auth.uid() or public.es_admin())
  with check (id = auth.uid() or public.es_admin());

-- El médico no puede cambiar su estado (salvo enviar a revisión) ni las notas del administrador.
create or replace function public.medicos_al_crear() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then
    if new.estado not in ('borrador', 'en_revision') then new.estado := 'borrador'; end if;
    new.nota_admin := null;
    new.revisado_at := null;
    if new.estado = 'en_revision' then new.enviado_at := now(); end if;
  end if;
  new.correo := (select email from auth.users where id = new.id);
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists medicos_crear on public.medicos;
create trigger medicos_crear before insert on public.medicos
  for each row execute function public.medicos_al_crear();

create or replace function public.medicos_al_editar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.id := old.id;
  new.correo := old.correo;
  new.created_at := old.created_at;
  if public.es_admin() and old.id <> auth.uid() then
    if new.estado is distinct from old.estado then new.revisado_at := now(); end if;
    return new;
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
drop trigger if exists medicos_editar on public.medicos;
create trigger medicos_editar before update on public.medicos
  for each row execute function public.medicos_al_editar();

-- ---------- Archivos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('carnes', 'carnes', false, 6291456, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']),
  ('fotos', 'fotos', true, 6291456, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'])
on conflict (id) do nothing;

drop policy if exists "carné: subir propio" on storage.objects;
create policy "carné: subir propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'carnes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "carné: reemplazar propio" on storage.objects;
create policy "carné: reemplazar propio" on storage.objects for update to authenticated
  using (bucket_id = 'carnes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "carné: ver propio o admin" on storage.objects;
create policy "carné: ver propio o admin" on storage.objects for select to authenticated
  using (bucket_id = 'carnes' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));

drop policy if exists "foto: subir propia" on storage.objects;
create policy "foto: subir propia" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "foto: reemplazar propia" on storage.objects;
create policy "foto: reemplazar propia" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "foto: ver propia o admin" on storage.objects;
create policy "foto: ver propia o admin" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));
