-- Aidú Med · Asistente, parte 2: almuerzo, recordatorios automáticos y aviso al paciente cuando el consultorio cancela.
-- <AVISO_SECRETO> se reemplaza por el valor real al ejecutarlo (no se guarda en el repositorio).

alter table public.medicos add column if not exists almuerzo_desde time;
alter table public.medicos add column if not exists almuerzo_hasta time;

-- Aviso al paciente (WhatsApp) cuando el consultorio cancela su cita.
create or replace function public.citas_avisar() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.estado = 'cancelada' and old.estado = 'confirmada' and new.cancelada_por = 'consultorio' then
    perform net.http_post(
      url := 'https://lpdtiyhcwubaryrrpxgw.supabase.co/functions/v1/asistente/evento',
      body := jsonb_build_object('tipo', 'cancelada_consultorio', 'cita_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso-secreto', '<AVISO_SECRETO>')
    );
  end if;
  return new;
end $$;
revoke all on function public.citas_avisar() from public, anon, authenticated;
drop trigger if exists citas_avisar on public.citas;
create trigger citas_avisar after update on public.citas for each row execute function public.citas_avisar();

-- Recordatorios: cada hora, a los 5 minutos.
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'aidu-recordatorios';
select cron.schedule('aidu-recordatorios', '5 * * * *', $$
  select net.http_post(
    url := 'https://lpdtiyhcwubaryrrpxgw.supabase.co/functions/v1/asistente/recordatorios',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso-secreto', '<AVISO_SECRETO>')
  );
$$);
