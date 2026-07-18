create table if not exists public.contact_reveal_events (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  blocked_until timestamptz
);

alter table public.contact_reveal_events enable row level security;

create index if not exists contact_reveal_events_ip_created_idx
  on public.contact_reveal_events (ip_hash, created_at desc);

create index if not exists contact_reveal_events_ip_blocked_idx
  on public.contact_reveal_events (ip_hash, blocked_until)
  where blocked_until is not null;
