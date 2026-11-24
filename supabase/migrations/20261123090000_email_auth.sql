-- Naija Auto Market — email sign-in
-- Links marketplace profiles to Supabase Auth users (email + password).
-- The phone number stays on the profile as the contact number dealers and buyers use.
-- Safe to run more than once.

alter table public.profiles add column if not exists email   text;
alter table public.profiles add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists profiles_email_key   on public.profiles (lower(email));
create unique index if not exists profiles_user_id_key on public.profiles (user_id);

-- Admin → Settings → "Require email verification" (on by default)
insert into public.settings (key, value) values ('email_verification', 'true'::jsonb)
on conflict (key) do nothing;
