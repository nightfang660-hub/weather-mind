-- PROFESSIONAL DATABASE SCHEMA DESIGN
-- Author: Antigravity AI
-- Description: High-security, normalized schema for Weather-Clip application (Free Tier Version).

-- -----------------------------------------------------------------------------
-- 1. ENUMS & TYPES
-- -----------------------------------------------------------------------------
-- Distinct roles: Admin (system management) and User (everyone else).
create type public.app_role as enum ('admin', 'user');

-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------

-- PROFILES: Stores public user information.
-- Security: Tightly coupled with auth.users via foreign key and triggers.
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  location text,

-- Role Management
role public.app_role not null default 'user',

-- Metadata
created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

-- Constraints
primary key (id),
  constraint username_length check (char_length(username) >= 3)
);

-- USER_LOGS: Audit trail for sensitive actions (Security Best Practice).
-- Helps detect suspicious activity.
create table public.user_logs (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  ip_address text,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SEARCH_HISTORY: Stores user search data securely.
create table public.search_history (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  query text not null,
  location_data jsonb, -- Stores the full geocoding result
  searched_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

-- Check if the current user is an admin.
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) - "The Firewall"
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

alter table public.user_logs enable row level security;

alter table public.search_history enable row level security;

-- PROFILES POLICIES
-- 1. Read: Everyone can read profiles (Public Directory).
create policy "Allow Public Read Access" on public.profiles for
select using (true);

-- 2. Update: Users can update their own row, Admins can update any.
create policy "Allow Individual or Admin Update" on public.profiles for
update using (
    auth.uid () = id
    or public.is_admin ()
);

-- 3. Insert: Handled by system trigger (Safest).
-- But if we allow manual insert for edge cases:
create policy "Allow Individual Insert" on public.profiles for
insert
with
    check (auth.uid () = id);

-- SEARCH_HISTORY POLICIES
-- Users: Read/Write own.
create policy "Users manage own history" on public.search_history for all using (auth.uid () = user_id);

-- Admins: Read all.
create policy "Admins can read all history" on public.search_history for
select using (public.is_admin ());

-- USER_LOGS POLICIES
-- Insert: System only (No user policy needed as triggers ignore RLS for INSERT if security definer used).
-- Read: Admin only.
create policy "Admins can read logs" on public.user_logs for
select using (public.is_admin ());

-- -----------------------------------------------------------------------------
-- 5. AUTOMATION & TRIGGERS
-- -----------------------------------------------------------------------------

-- Auto-update 'updated_at' timestamp
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on public.profiles
  for each row execute procedure moddatetime (updated_at);

-- Auto-create profile on Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'user' -- Default role is always 'user'
  );
  
  -- Log the creation event
  insert into public.user_logs (user_id, action, details)
  values (new.id, 'ACCOUNT_CREATED', '{"method": "email"}'::jsonb);
  
  return new;
end;
$$ language plpgsql security definer;

-- Bind the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 6. INDEXES (Performance)
-- -----------------------------------------------------------------------------
create index profiles_username_idx on public.profiles (username);

create index search_history_user_id_idx on public.search_history (user_id);

create index search_history_searched_at_idx on public.search_history (searched_at desc);