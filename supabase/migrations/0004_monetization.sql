-- ── Users: subscription + coins ───────────────────────────────────────────────
alter table public.users
  add column if not exists is_pro             boolean not null default false,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists coin_balance       int not null default 0,
  add column if not exists tip_total          int not null default 0; -- lifetime tips received (cents)

-- ── Traps: premium pricing ────────────────────────────────────────────────────
alter table public.traps
  add column if not exists is_premium  boolean not null default false,
  add column if not exists price_cents int not null default 0;

-- ── Cosmetics ─────────────────────────────────────────────────────────────────
create table if not exists public.cosmetics (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('badge', 'frame', 'theme')),
  price_cents int not null default 0,
  image_url   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.user_cosmetics (
  user_id      uuid not null references public.users(id) on delete cascade,
  cosmetic_id  uuid not null references public.cosmetics(id) on delete cascade,
  is_active    boolean not null default false,
  acquired_at  timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

create index on public.user_cosmetics (user_id);

-- ── Coin transactions ─────────────────────────────────────────────────────────
create table if not exists public.coin_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  amount      int not null, -- positive = credit, negative = debit
  reason      text not null, -- 'escape', 'trap_published', 'challenge_sent', 'challenge_received', 'purchase', 'spend_challenge'
  ref_id      uuid,          -- optional: attempt_id, trap_id, etc.
  created_at  timestamptz not null default now()
);

create index on public.coin_transactions (user_id, created_at desc);

-- ── Tips ──────────────────────────────────────────────────────────────────────
create table if not exists public.tips (
  id           uuid primary key default gen_random_uuid(),
  tipper_id    uuid not null references public.users(id) on delete cascade,
  creator_id   uuid not null references public.users(id) on delete cascade,
  trap_id      uuid references public.traps(id) on delete set null,
  amount_cents int not null,
  created_at   timestamptz not null default now()
);

create index on public.tips (creator_id, created_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.cosmetics enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.tips enable row level security;

create policy "cosmetics: public read"
  on public.cosmetics for select using (true);

create policy "user_cosmetics: own access"
  on public.user_cosmetics for all using (user_id = auth.uid());

create policy "coin_transactions: own read"
  on public.coin_transactions for select using (user_id = auth.uid());

create policy "tips: tipper insert"
  on public.tips for insert with check (tipper_id = auth.uid());

create policy "tips: participant read"
  on public.tips for select using (tipper_id = auth.uid() or creator_id = auth.uid());

-- ── Seed cosmetics ────────────────────────────────────────────────────────────
insert into public.cosmetics (name, type, price_cents) values
  ('Gold Crown',     'badge',  199),
  ('Neon Frame',     'frame',  149),
  ('Shadow Theme',   'theme',  299),
  ('Brain Badge',    'badge',  99),
  ('Fire Frame',     'frame',  249),
  ('Midnight Theme', 'theme',  199)
on conflict do nothing;

-- ── RPCs for coin operations ──────────────────────────────────────────────────
create or replace function award_coins(
  p_user_id uuid,
  p_amount  int,
  p_reason  text,
  p_ref_id  uuid default null
) returns void language plpgsql security definer as $$
begin
  update public.users set coin_balance = coin_balance + p_amount where id = p_user_id;
  insert into public.coin_transactions (user_id, amount, reason, ref_id)
    values (p_user_id, p_amount, p_reason, p_ref_id);
end;
$$;

create or replace function spend_coins(
  p_user_id uuid,
  p_amount  int,
  p_reason  text,
  p_ref_id  uuid default null
) returns boolean language plpgsql security definer as $$
declare
  current_balance int;
begin
  select coin_balance into current_balance from public.users where id = p_user_id;
  if current_balance < p_amount then
    return false;
  end if;
  update public.users set coin_balance = coin_balance - p_amount where id = p_user_id;
  insert into public.coin_transactions (user_id, amount, reason, ref_id)
    values (p_user_id, -p_amount, p_reason, p_ref_id);
  return true;
end;
$$;

create or replace function record_tip(
  p_tipper_id    uuid,
  p_creator_id   uuid,
  p_trap_id      uuid,
  p_amount_cents int
) returns void language plpgsql security definer as $$
begin
  insert into public.tips (tipper_id, creator_id, trap_id, amount_cents)
    values (p_tipper_id, p_creator_id, p_trap_id, p_amount_cents);
  update public.users set tip_total = tip_total + p_amount_cents where id = p_creator_id;
end;
$$;
