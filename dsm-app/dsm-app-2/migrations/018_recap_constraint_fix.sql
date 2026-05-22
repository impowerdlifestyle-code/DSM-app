-- Replace expression-based unique index with a plain unique constraint
-- so PostgREST upsert (onConflict) can target it.

-- backfill any null recipient_ids (athlete recipient = user_id)
update public.recap_log
  set recipient_id = user_id
  where recipient_id is null;

alter table public.recap_log
  alter column recipient_id set not null;

drop index if exists recap_log_unique_per_recipient;

alter table public.recap_log
  drop constraint if exists recap_log_recipient_unique;
alter table public.recap_log
  add  constraint recap_log_recipient_unique
       unique (user_id, audience, recipient_id, week_key);
