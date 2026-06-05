-- ==================== FIX: Infinite RLS Recursion ====================
-- Run this sa Supabase Dashboard > SQL Editor (ONE TIME LANG)
-- ======================================================================

-- 1. Siguraduhin na may is_admin column ang profiles (para sa fix)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. I-set ang is_admin = true para sa mga role = 'admin'
UPDATE public.profiles SET is_admin = true WHERE role = 'admin' AND (is_admin IS NULL OR is_admin = false);

-- 3. Gumawa ng security definer function para maiwasan ang recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true);
$$;

-- 4. Palitan ang lahat ng admin policies para gamitin ang function

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all userdata" ON userdata;
CREATE POLICY "Admins can view all userdata"
  ON userdata FOR SELECT
  USING (public.is_admin());

-- 5. Gumawa ng RPC function para magbasa ng userdata (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_userdata(uid UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT data FROM public.userdata WHERE id = uid;
$$;
