-- Lead email notifications: on each new public.leads row, call the notify-lead
-- Edge Function via pg_net. The real x-webhook-secret value lives only in the
-- database (and the function's WEBHOOK_SECRET secret) — redacted here because
-- this repo is public.
create extension if not exists pg_net;

create or replace function public.notify_lead_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url     := 'https://fmhvhvwtiwrddfngoffn.supabase.co/functions/v1/notify-lead',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-webhook-secret', '<WEBHOOK_SECRET>'   -- set to the deployed value
               ),
    body    := jsonb_build_object('record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

drop trigger if exists on_lead_created on public.leads;
create trigger on_lead_created
  after insert on public.leads
  for each row execute function public.notify_lead_email();
