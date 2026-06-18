-- Settle expired raffles on a schedule using Supabase Cron (pg_cron + pg_net).
-- A Postgres cron job POSTs to the Next.js endpoint every 30 minutes; the
-- endpoint activates due raffles and ends raffles past their end_date on-chain.
--
-- Both extensions are included free on all Supabase plans. Edit the two
-- placeholders below (or use the Vault variant at the bottom) before running.
--   <APP_URL>      deployed app origin, no trailing slash, e.g. https://your-app.vercel.app
--   <CRON_SECRET>  must match the CRON_SECRET env var set in the app

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent: drop a previous version of the job before (re)creating it.
select cron.unschedule('settle-expired-raffles')
where exists (select 1 from cron.job where jobname = 'settle-expired-raffles');

select cron.schedule(
  'settle-expired-raffles',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := '<APP_URL>/api/cron/settle-raffles',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Inspect the schedule and recent runs:
--   select * from cron.job where jobname = 'settle-expired-raffles';
--   select * from cron.job_run_details
--     where jobid = (select jobid from cron.job where jobname = 'settle-expired-raffles')
--     order by start_time desc limit 10;
--   select * from net._http_response order by created desc limit 10;

-- ---------------------------------------------------------------------------
-- ALTERNATIVE (recommended for production): keep the URL and secret out of the
-- job definition (cron.job is world-readable to the postgres role) via Vault.
--
--   select vault.create_secret('https://your-app.vercel.app', 'app_url');
--   select vault.create_secret('your-cron-secret', 'cron_secret');
--
--   select cron.schedule(
--     'settle-expired-raffles',
--     '*/30 * * * *',
--     $$
--     select net.http_post(
--       url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url')
--              || '/api/cron/settle-raffles',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'Authorization', 'Bearer ' ||
--           (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
--       ),
--       body := '{}'::jsonb,
--       timeout_milliseconds := 60000
--     );
--     $$
--   );
