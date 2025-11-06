-- Function: public.reset_all_user_credits
-- Description: Overwrites balance_bigint to 400 for all rows in public.user_credits.
-- Notes: No audit logging; reserved_bigint remains unchanged.

create or replace function public.reset_all_user_credits()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.user_credits
  set balance_bigint = 400,
      updated_at = now();
end;
$$;

revoke all on function public.reset_all_user_credits() from public;
grant execute on function public.reset_all_user_credits() to postgres, authenticated, service_role;


