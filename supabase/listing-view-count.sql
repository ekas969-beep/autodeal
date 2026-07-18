alter table public.listings
  add column if not exists view_count integer not null default 0;

create index if not exists listings_view_count_idx
  on public.listings (view_count);

create or replace function public.increment_listing_view_count(p_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  update public.listings
  set view_count = coalesce(view_count, 0) + 1
  where id = p_listing_id
  returning view_count into next_count;

  return coalesce(next_count, 0);
end;
$$;
