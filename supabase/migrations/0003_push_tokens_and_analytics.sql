-- Push token on users
alter table public.users add column if not exists push_token text;

-- Analytics events table
create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete set null,
  event       text not null,
  properties  jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index on public.analytics_events (event, created_at desc);
create index on public.analytics_events (user_id, created_at desc);

-- Analytics is write-only from client (insert only, no reads via RLS)
alter table public.analytics_events enable row level security;

create policy "analytics: authenticated insert"
  on public.analytics_events for insert
  with check (user_id = auth.uid());
