-- Player-side group joining: a shareable 6-char code per coaching group +
-- a SECURITY DEFINER RPC so an athlete can self-join by code without opening
-- up the coaching_group_members insert policy (which stays lead-coach-only).

alter table public.coaching_groups add column if not exists join_code text;

update public.coaching_groups
  set join_code = upper(substr(md5(random()::text || id::text), 1, 6))
  where join_code is null;

create unique index if not exists coaching_groups_join_code_idx
  on public.coaching_groups (join_code);

create or replace function public.join_coaching_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select id into v_group
    from public.coaching_groups
    where upper(join_code) = upper(trim(p_code));
  if v_group is null then
    raise exception 'group code not found' using errcode = 'P0002';
  end if;
  insert into public.coaching_group_members (group_id, user_id, role_in_group)
    values (v_group, auth.uid(), 'athlete')
  on conflict (group_id, user_id) do nothing;
  return v_group;
end;
$$;

revoke all on function public.join_coaching_group(text) from public;
grant execute on function public.join_coaching_group(text) to authenticated, service_role;

notify pgrst, 'reload schema';
