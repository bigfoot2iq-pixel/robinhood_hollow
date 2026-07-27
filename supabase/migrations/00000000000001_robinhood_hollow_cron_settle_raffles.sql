-- Settle expired raffles on a schedule using Supabase Cron (pg_cron + pg_net).
-- A Postgres cron job POSTs to the Next.js endpoint; the endpoint activates due
-- raffles and ends raffles past their end_date on-chain.
--
-- Kept out of the main schema file because it needs one placeholder filled in
-- before it will do anything useful:
--   <CRON_SECRET>   must match the CRON_SECRET env var set for THIS app in Vercel
--                   (not another app's secret). Do NOT commit the real value here
--                   -- cron.job is readable by the postgres role and this file is
--                   tracked in git. Paste the filled statement into the Supabase
--                   SQL editor instead, or use the Vault variant at the bottom.
--
-- IMPORTANT: this Postgres instance is shared with other apps, which is why every
-- object here carries a robinhood_hollow prefix. cron.job is shared too, and its
-- jobname is the unique key -- cron.schedule() REPLACES a job of the same name.
-- Never reuse a bare name like 'settle-expired-raffles'; that would silently
-- clobber a sibling app's job.
--
-- NOTE: schedule is every 5 minutes. The endpoint processes at most
--       SETTLE_BATCH_SIZE (default 20) raffles per run, oldest first, so each
--       invocation stays short. pg_cron also accepts sub-minute syntax
--       ('30 seconds') for tighter settlement, but overlapping runs (two POSTs in
--       flight) cause watchdog nonce collisions -- only go below a minute if the
--       endpoint is guarded by a DB advisory lock.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent: drop a previous version of the job before (re)creating it.
select cron.unschedule('robinhood-hollow-settle-expired-raffles')
where exists (select 1 from cron.job where jobname = 'robinhood-hollow-settle-expired-raffles');

select cron.schedule(
  'robinhood-hollow-settle-expired-raffles',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://robinhood-hollow-sooty.vercel.app/api/cron/settle-raffles',
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
--   select * from cron.job where jobname = 'robinhood-hollow-settle-expired-raffles';
--   select * from cron.job_run_details
--     where jobid = (select jobid from cron.job where jobname = 'robinhood-hollow-settle-expired-raffles')
--     order by start_time desc limit 10;
--   select * from net._http_response order by created desc limit 10;

-- ---------------------------------------------------------------------------
-- ALTERNATIVE (recommended for production): keep the URL and secret out of the
-- job definition (cron.job is world-readable to the postgres role) via Vault.
--
--   select vault.create_secret('https://robinhood-hollow-sooty.vercel.app', 'robinhood_hollow_app_url');
--   select vault.create_secret('<CRON_SECRET>', 'robinhood_hollow_cron_secret');
--
--   select cron.schedule(
--     'robinhood-hollow-settle-expired-raffles',
--     '*/5 * * * *',
--     $$
--     select net.http_post(
--       url := (select decrypted_secret from vault.decrypted_secrets
--                where name = 'robinhood_hollow_app_url')
--              || '/api/cron/settle-raffles',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'Authorization', 'Bearer ' ||
--           (select decrypted_secret from vault.decrypted_secrets
--             where name = 'robinhood_hollow_cron_secret')
--       ),
--       body := '{}'::jsonb,
--       timeout_milliseconds := 60000
--     );
--     $$
--   );
