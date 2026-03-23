-- RPC helpers for server-side counter increments
-- Called with service role key, so bypass RLS is fine

create or replace function increment_attempt_count(trap_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.traps set attempt_count = attempt_count + 1 where id = trap_id;
end;
$$;

create or replace function increment_escape_count(trap_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.traps set escape_count = escape_count + 1 where id = trap_id;
  update public.traps
    set escape_count = greatest(escape_count, 0)
  where id = trap_id;
end;
$$;

create or replace function increment_user_escapes(user_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.users set traps_escaped = traps_escaped + 1 where id = user_id;
end;
$$;
