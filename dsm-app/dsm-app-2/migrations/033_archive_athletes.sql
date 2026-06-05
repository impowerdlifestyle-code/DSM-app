-- Soft-archive for athletes: hide from the active admin roster without
-- deleting their data. Reversible (set back to null to restore).
alter table public.profiles add column if not exists archived_at timestamptz;
create index if not exists profiles_archived_idx on public.profiles (archived_at);
notify pgrst, 'reload schema';
