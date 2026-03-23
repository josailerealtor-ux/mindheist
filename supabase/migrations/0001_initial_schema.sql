-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────

create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  avatar_url   text,
  traps_built  int not null default 0,
  traps_escaped int not null default 0,
  created_at   timestamptz not null default now()
);

create type trap_status as enum ('draft', 'published', 'archived');
create type trap_difficulty as enum ('easy', 'medium', 'hard', 'expert');

create table public.traps (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.users(id) on delete cascade,
  title         text not null,
  description   text not null default '',
  status        trap_status not null default 'draft',
  steps         jsonb not null default '[]',
  solution      jsonb not null default '{}',
  difficulty    trap_difficulty not null default 'medium',
  attempt_count int not null default 0,
  escape_count  int not null default 0,
  like_count    int not null default 0,
  created_at    timestamptz not null default now(),
  published_at  timestamptz
);

create type attempt_status as enum ('in_progress', 'escaped', 'failed');

create table public.attempts (
  id           uuid primary key default gen_random_uuid(),
  trap_id      uuid not null references public.traps(id) on delete cascade,
  player_id    uuid not null references public.users(id) on delete cascade,
  status       attempt_status not null default 'in_progress',
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  elapsed_ms   int,
  fail_count   int not null default 0,
  current_step int not null default 0,
  events       jsonb not null default '[]'
);

create table public.replays (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid not null unique references public.attempts(id) on delete cascade,
  trap_id     uuid not null references public.traps(id) on delete cascade,
  player_id   uuid not null references public.users(id) on delete cascade,
  is_public   boolean not null default false,
  view_count  int not null default 0,
  events      jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

create table public.likes (
  user_id  uuid not null references public.users(id) on delete cascade,
  trap_id  uuid not null references public.traps(id) on delete cascade,
  primary key (user_id, trap_id)
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  trap_id    uuid not null references public.traps(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create type challenge_status as enum ('pending', 'accepted', 'resolved');

create table public.challenges (
  id            uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.users(id) on delete cascade,
  target_id     uuid not null references public.users(id) on delete cascade,
  trap_id       uuid not null references public.traps(id) on delete cascade,
  status        challenge_status not null default 'pending',
  created_at    timestamptz not null default now(),
  check (challenger_id <> target_id)
);

-- ──────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────

create index on public.traps (creator_id);
create index on public.traps (status, published_at desc);
create index on public.attempts (trap_id);
create index on public.attempts (player_id);
create index on public.replays (trap_id) where is_public = true;
create index on public.comments (trap_id, created_at desc);
create index on public.challenges (target_id, status);

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.traps enable row level security;
alter table public.attempts enable row level security;
alter table public.replays enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.challenges enable row level security;

-- users: anyone can read profiles, only owner can update
create policy "users: public read"
  on public.users for select using (true);

create policy "users: self insert"
  on public.users for insert with check (auth.uid() = id);

create policy "users: self update"
  on public.users for update using (auth.uid() = id);

-- traps: published traps are public; drafts only visible to creator
create policy "traps: read published or own"
  on public.traps for select
  using (status = 'published' or creator_id = auth.uid());

create policy "traps: insert own"
  on public.traps for insert with check (creator_id = auth.uid());

create policy "traps: update own draft"
  on public.traps for update using (creator_id = auth.uid());

-- attempts: only the player can see their own attempts
create policy "attempts: player access"
  on public.attempts for all using (player_id = auth.uid());

-- replays: public replays are readable by all; private only by player
create policy "replays: read public or own"
  on public.replays for select
  using (is_public = true or player_id = auth.uid());

create policy "replays: player manage"
  on public.replays for insert with check (player_id = auth.uid());

create policy "replays: player update"
  on public.replays for update using (player_id = auth.uid());

-- likes
create policy "likes: public read"
  on public.likes for select using (true);

create policy "likes: self manage"
  on public.likes for all using (user_id = auth.uid());

-- comments: public read, authenticated write
create policy "comments: public read"
  on public.comments for select using (true);

create policy "comments: authenticated insert"
  on public.comments for insert with check (user_id = auth.uid());

-- challenges: participants can see their own
create policy "challenges: participant access"
  on public.challenges for select
  using (challenger_id = auth.uid() or target_id = auth.uid());

create policy "challenges: challenger insert"
  on public.challenges for insert with check (challenger_id = auth.uid());

create policy "challenges: target update"
  on public.challenges for update using (target_id = auth.uid());

-- ──────────────────────────────────────────────
-- TRIGGERS — keep denormalized counters in sync
-- ──────────────────────────────────────────────

create or replace function increment_trap_like()
returns trigger language plpgsql security definer as $$
begin
  update public.traps set like_count = like_count + 1 where id = new.trap_id;
  return new;
end;
$$;

create or replace function decrement_trap_like()
returns trigger language plpgsql security definer as $$
begin
  update public.traps set like_count = greatest(like_count - 1, 0) where id = old.trap_id;
  return old;
end;
$$;

create trigger on_like_insert after insert on public.likes
  for each row execute function increment_trap_like();

create trigger on_like_delete after delete on public.likes
  for each row execute function decrement_trap_like();

create or replace function on_trap_published()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'published' and old.status <> 'published' then
    update public.users set traps_built = traps_built + 1 where id = new.creator_id;
  end if;
  return new;
end;
$$;

create trigger on_trap_status_change after update on public.traps
  for each row execute function on_trap_published();
