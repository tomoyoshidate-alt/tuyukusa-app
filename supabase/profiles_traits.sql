-- profiles.traits JSONB for location, constitution, etc.
-- Run in Supabase SQL Editor for project "Tsuyukusa AD"

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    alter table public.profiles
      add column if not exists traits jsonb not null default '{}'::jsonb;

    comment on column public.profiles.traits is
      'User traits (location, constitution, etc.). Example: {"location":{"city":"調布市","lat":35.6506,"lon":139.5407}}';
  end if;
end $$;
