alter table public.payments
add column if not exists user_id uuid references auth.users(id) on delete cascade,
add column if not exists listing_id uuid null references public.listings(id) on delete set null,
add column if not exists stripe_session_id text,
add column if not exists stripe_payment_intent_id text null,
add column if not exists payment_type text,
add column if not exists plan_key text,
add column if not exists amount_cents integer,
add column if not exists currency text not null default 'eur',
add column if not exists status text not null default 'pending',
add column if not exists credits_purchased integer not null default 0,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists payments_stripe_session_id_key
on public.payments (stripe_session_id)
where stripe_session_id is not null;

alter table public.credit_transactions
add column if not exists user_id uuid references auth.users(id) on delete cascade,
add column if not exists listing_id uuid null references public.listings(id) on delete set null,
add column if not exists payment_id uuid null references public.payments(id) on delete set null,
add column if not exists transaction_type text,
add column if not exists credits integer,
add column if not exists description text,
add column if not exists created_at timestamptz not null default now();

notify pgrst, 'reload schema';
