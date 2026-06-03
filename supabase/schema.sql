create extension if not exists pgcrypto;

create type public.instrument as enum ('guitar', 'piano');
create type public.sass_level as enum ('light', 'balanced', 'savage');
create type public.input_mode as enum ('mic', 'midi');
create type public.license_status as enum ('licensed', 'public-domain', 'reference-only', 'user-owned', 'unverified');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  target_level text not null default 'beginner-intermediate',
  sass_level public.sass_level not null default 'balanced',
  created_at timestamptz not null default now()
);

create table public.arrangements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  artist text not null,
  instrument public.instrument not null,
  format text not null,
  difficulty text not null,
  bpm integer not null check (bpm between 30 and 240),
  song_key text not null,
  source text not null,
  source_name text not null,
  license_status public.license_status not null,
  external_url text not null,
  reference_only boolean not null default true,
  rights_metadata jsonb not null default '{}'::jsonb,
  tracks jsonb not null default '[]'::jsonb,
  measures jsonb not null default '[]'::jsonb,
  file_path text,
  created_at timestamptz not null default now()
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arrangement_id uuid references public.arrangements(id) on delete set null,
  file_path text not null,
  file_name text not null,
  mime_type text,
  rights_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.performance_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arrangement_id uuid references public.arrangements(id) on delete set null,
  instrument public.instrument not null,
  input_type public.input_mode not null,
  attempt_summary jsonb not null,
  raw_audio_retained_locally boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arrangement_id uuid references public.arrangements(id) on delete set null,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.arrangements enable row level security;
alter table public.uploads enable row level security;
alter table public.performance_attempts enable row level security;
alter table public.progress_events enable row level security;

create policy "profiles are self readable"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are self writable"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles are self updatable"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "public catalog arrangements are readable"
  on public.arrangements for select
  using (owner_id is null or auth.uid() = owner_id);

create policy "users can write owned arrangements"
  on public.arrangements for insert
  with check (auth.uid() = owner_id);

create policy "users can update owned arrangements"
  on public.arrangements for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "users can manage own uploads"
  on public.uploads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can manage own attempts"
  on public.performance_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can manage own progress"
  on public.progress_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('user-arrangements', 'user-arrangements', false)
on conflict (id) do nothing;

create policy "users read own arrangement files"
  on storage.objects for select
  using (bucket_id = 'user-arrangements' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users insert own arrangement files"
  on storage.objects for insert
  with check (bucket_id = 'user-arrangements' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users update own arrangement files"
  on storage.objects for update
  using (bucket_id = 'user-arrangements' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'user-arrangements' and auth.uid()::text = (storage.foldername(name))[1]);
