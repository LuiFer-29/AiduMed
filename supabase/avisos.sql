-- Aviso por correo al médico cuando cambia su estado (ya ejecutado en Supabase).
-- El valor real de x-aviso-secreto vive solo en la base de datos y en el secreto AVISO_SECRETO de Edge Functions.
create extension if not exists pg_net with schema extensions;

create or replace function public.avisar_cambio_estado() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.estado is distinct from old.estado then
    perform net.http_post(
      url := 'https://lpdtiyhcwubaryrrpxgw.supabase.co/functions/v1/aviso-estado',
      body := jsonb_build_object('record', to_jsonb(new), 'old_record', jsonb_build_object('estado', old.estado)),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso-secreto', '<AVISO_SECRETO>')
    );
  end if;
  return new;
end $$;
revoke all on function public.avisar_cambio_estado() from public, anon, authenticated;

drop trigger if exists medicos_avisar on public.medicos;
create trigger medicos_avisar after update on public.medicos
  for each row execute function public.avisar_cambio_estado();
