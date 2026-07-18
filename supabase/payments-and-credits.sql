alter table public.profiles
add column if not exists full_name text,
add column if not exists role text default 'private_seller',
add column if not exists credits_balance integer not null default 0,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

alter table public.listings
add column if not exists status text not null default 'active',
add column if not exists is_premium boolean not null default false,
add column if not exists premium_badge boolean not null default false,
add column if not exists priority_search boolean not null default false,
add column if not exists homepage_featured boolean not null default false,
add column if not exists video_enabled boolean not null default false,
add column if not exists photo_limit integer not null default 5,
add column if not exists expires_at timestamptz,
add column if not exists premium_until timestamptz,
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid null references public.listings(id) on delete set null,
  stripe_session_id text unique not null,
  stripe_payment_intent_id text null,
  payment_type text not null check (payment_type in ('premium_boost', 'dealer_credit_pack')),
  plan_key text not null check (plan_key in ('premium_boost', 'dealer_starter', 'dealer_pro', 'dealer_elite')),
  amount_cents integer not null,
  currency text not null default 'eur',
  status text not null check (status in ('pending', 'paid', 'failed', 'refunded')),
  credits_purchased integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid null references public.listings(id) on delete set null,
  payment_id uuid null references public.payments(id) on delete set null,
  transaction_type text not null check (transaction_type in ('purchase', 'spend', 'refund', 'adjustment')),
  credits integer not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
alter table public.credit_transactions enable row level security;

drop policy if exists "Users can read their own payments" on public.payments;
drop policy if exists "Users can read their own credit transactions" on public.credit_transactions;

create policy "Users can read their own payments"
on public.payments
for select
using (user_id = auth.uid());

create policy "Users can read their own credit transactions"
on public.credit_transactions
for select
using (user_id = auth.uid());

create or replace function public.add_user_credits(
  p_user_id uuid,
  p_credits integer,
  p_payment_id uuid,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_credits <= 0 then
    raise exception 'Credits must be positive';
  end if;

  if exists (
    select 1
    from public.credit_transactions
    where payment_id = p_payment_id
    and transaction_type = 'purchase'
  ) then
    return;
  end if;

  update public.profiles
  set credits_balance = coalesce(credits_balance, 0) + p_credits,
      updated_at = now()
  where id = p_user_id;

  insert into public.credit_transactions (
    user_id,
    payment_id,
    transaction_type,
    credits,
    description
  )
  values (
    p_user_id,
    p_payment_id,
    'purchase',
    p_credits,
    p_description
  );
end;
$$;

create or replace function public.spend_user_credit_for_listing(
  p_user_id uuid,
  p_listing_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_until timestamptz := now() + interval '60 days';
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not allowed';
  end if;

  if not exists (
    select 1
    from public.listings
    where id = p_listing_id
    and user_id = p_user_id
  ) then
    raise exception 'Listing not found';
  end if;

  select credits_balance
  into v_balance
  from public.profiles
  where id = p_user_id
  for update;

  if coalesce(v_balance, 0) < 1 then
    raise exception 'Not enough credits';
  end if;

  update public.profiles
  set credits_balance = credits_balance - 1,
      updated_at = now()
  where id = p_user_id;

  update public.listings
  set status = 'active',
      plan_type = 'premium',
      is_premium = true,
      premium_badge = true,
      priority_search = true,
      homepage_featured = true,
      video_enabled = true,
      photo_limit = 20,
      expires_at = v_until,
      premium_until = v_until,
      updated_at = now()
  where id = p_listing_id
  and user_id = p_user_id;

  insert into public.credit_transactions (
    user_id,
    listing_id,
    transaction_type,
    credits,
    description
  )
  values (
    p_user_id,
    p_listing_id,
    'spend',
    -1,
    'Used 1 credit for Premium'
  );
end;
$$;

create or replace function public.expire_premium_listings()
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
  set is_premium = false,
      premium_badge = false,
      priority_search = false,
      homepage_featured = false,
      video_enabled = false,
      photo_limit = 5,
      plan_type = 'free',
      updated_at = now()
  where premium_until < now()
  and is_premium = true;
$$;

create or replace function public.expire_listings()
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
  set status = 'expired',
      expires_at = coalesce(
        expires_at,
        case
          when is_premium = true or plan_type = 'premium'
            then created_at + interval '60 days'
          else created_at + interval '30 days'
        end
      ),
      updated_at = now()
  where status = 'active'
  and coalesce(
    expires_at,
    case
      when is_premium = true or plan_type = 'premium'
        then created_at + interval '60 days'
      else created_at + interval '30 days'
    end
  ) < now();
$$;

create index if not exists listings_public_sort_idx
on public.listings (status, is_premium desc, priority_search desc, homepage_featured desc, created_at desc);

create index if not exists credit_transactions_user_created_idx
on public.credit_transactions (user_id, created_at desc);
