create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'expire-premium-listings-hourly',
  '0 * * * *',
  $$select public.expire_premium_listings();$$
);

select cron.schedule(
  'expire-listings-hourly',
  '5 * * * *',
  $$select public.expire_listings();$$
);
