-- MIGRATION: REMOVE PRO PLAN & ENFORCE FREE ACCESS
-- Author: Antigravity AI
-- Date: 2026-01-11
-- Description: Unifies user roles to 'admin' and 'user'. Removes 'pro'. Updates RLS.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. DATA MIGRATION
-- -----------------------------------------------------------------------------
-- Downgrade any existing 'pro' users to 'user'.
UPDATE public.profiles SET role = 'user' WHERE role = 'pro';

-- -----------------------------------------------------------------------------
-- 2. ENUM REPLACEMENT
-- -----------------------------------------------------------------------------
-- PostgreSQL enums require a recreation step to remove values safely.
ALTER TYPE public.app_role RENAME TO app_role_old;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Update the column to use the new enum type
ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role,
  ALTER COLUMN role SET DEFAULT 'user';

-- Drop the old enum type
DROP TYPE public.app_role_old;

-- -----------------------------------------------------------------------------
-- 3. ADMIN HELPER FUNCTION
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 4. RLS POLICY UPDATES
-- -----------------------------------------------------------------------------

-- --- PROFILES ---
-- Allow users to update their own profile, OR admins to update any profile.
DROP POLICY IF EXISTS "Allow Individual Update" ON public.profiles;

CREATE POLICY "Allow Individual or Admin Update" ON public.profiles FOR
UPDATE USING (
    auth.uid () = id
    OR public.is_admin ()
);

-- --- SEARCH_HISTORY ---
-- Existing: "Users manage their own history" (keep this, or recreate to be sure)
-- Add: Admin read access
-- We'll drop and recreate to ensure state.
DROP POLICY IF EXISTS "Users manage their own history" ON public.search_history;

CREATE POLICY "Users manage own history" ON public.search_history FOR ALL USING (auth.uid () = user_id);

CREATE POLICY "Admins can read all history" ON public.search_history FOR
SELECT USING (public.is_admin ());

-- --- USER_LOGS ---
-- Insert: System only (handled by triggers/security definer functions, so no INSERT policy needed for users)
-- Read: Admin only
DROP POLICY IF EXISTS "Admins can read logs" ON public.user_logs;

CREATE POLICY "Admins can read logs" ON public.user_logs FOR
SELECT USING (public.is_admin ());

COMMIT;