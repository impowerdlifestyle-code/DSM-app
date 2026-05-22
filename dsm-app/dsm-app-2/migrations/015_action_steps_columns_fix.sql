-- action_steps column drift fix
-- Schema canon (supabase-schema.sql) uses *_comments + visualization_*.
-- Bundled supabase-full-migration.sql created *_comment singular + no
-- visualization fields. Code expects canon. This bridges.

do $$
begin
  -- rename *_comment → *_comments where needed
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='action_steps' and column_name='shark_comment')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='action_steps' and column_name='shark_comments') then
    alter table public.action_steps rename column shark_comment to shark_comments;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='action_steps' and column_name='goldfish_comment')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='action_steps' and column_name='goldfish_comments') then
    alter table public.action_steps rename column goldfish_comment to goldfish_comments;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='action_steps' and column_name='selftalk_comment')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='action_steps' and column_name='selftalk_comments') then
    alter table public.action_steps rename column selftalk_comment to selftalk_comments;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='action_steps' and column_name='tuneout_comment')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='action_steps' and column_name='tuneout_comments') then
    alter table public.action_steps rename column tuneout_comment to tuneout_comments;
  end if;
end$$;

-- Add visualization fields if missing
alter table public.action_steps
  add column if not exists visualization_used     boolean default false,
  add column if not exists visualization_occasion text,
  add column if not exists visualization_comments text;
