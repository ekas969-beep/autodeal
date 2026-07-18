create table if not exists public.site_errors (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'error',
  message text not null,
  stack text,
  source text,
  pathname text,
  user_agent text,
  user_id uuid,
  user_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

alter table public.site_errors enable row level security;

create index if not exists site_errors_created_at_idx
  on public.site_errors (created_at desc);

create index if not exists site_errors_unresolved_idx
  on public.site_errors (resolved_at)
  where resolved_at is null;
