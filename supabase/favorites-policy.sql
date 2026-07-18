create table if not exists public.listing_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

alter table public.listing_favorites enable row level security;

drop policy if exists "Users can view their own favorites" on public.listing_favorites;
drop policy if exists "Users can add their own favorites" on public.listing_favorites;
drop policy if exists "Users can remove their own favorites" on public.listing_favorites;

create policy "Users can view their own favorites"
on public.listing_favorites
for select
using (user_id = auth.uid());

create policy "Users can add their own favorites"
on public.listing_favorites
for insert
with check (user_id = auth.uid());

create policy "Users can remove their own favorites"
on public.listing_favorites
for delete
using (user_id = auth.uid());
