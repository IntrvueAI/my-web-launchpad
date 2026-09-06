-- Retention for app_logs. NOT scheduled by this migration — pg_cron availability on this project
-- is unverified, so wiring up a schedule that could fail to apply is avoided here. Schedule once,
-- manually, via Supabase Dashboard -> Database -> Extensions (enable pg_cron) -> Database -> Cron
-- Jobs -> new job, e.g. "0 3 * * *" running: select public.cleanup_old_app_logs(60);
-- (equivalent SQL: select cron.schedule('cleanup-app-logs', '0 3 * * *', $$select public.cleanup_old_app_logs(60);$$);)
CREATE OR REPLACE FUNCTION public.cleanup_old_app_logs(retention_days INTEGER DEFAULT 60)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.app_logs WHERE created_at < now() - (retention_days || ' days')::interval;
END;
$function$;
