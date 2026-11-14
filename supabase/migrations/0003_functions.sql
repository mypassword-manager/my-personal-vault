-- Atomic fixed-window rate limiter used by the worker.
create or replace function public.bump_rate_limit(
  p_bucket text,
  p_window_seconds integer,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set count = case
          when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then 1
          else public.rate_limits.count + 1
        end,
        window_start = case
          when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            then now()
          else public.rate_limits.window_start
        end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

revoke all on function public.bump_rate_limit(text, integer, integer) from public;
grant execute on function public.bump_rate_limit(text, integer, integer) to service_role;

-- Housekeeping: drop stale buckets and expired challenges.
create or replace function public.purge_stale_auth_rows()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where window_start < now() - interval '2 days';
  delete from public.pin_challenges where created_at < now() - interval '2 days';
  delete from public.pin_reset_tokens where expires_at < now() - interval '2 days';
$$;