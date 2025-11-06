-- Enable pg_cron (no-op if already enabled)
create extension if not exists pg_cron with schema extensions;

-- Schedule the daily reset at 00:00 UTC
select cron.schedule(
  'reset_user_credits_to_400',
  '0 0 * * *',
  $$select public.reset_all_user_credits();$$
);


