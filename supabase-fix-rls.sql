-- ==================== FIX: Infinite RLS Recursion ====================
-- Run this sa Supabase Dashboard > SQL Editor
-- ======================================================================

-- 1. Gumawa ng security definer function (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true);
$$;

-- 2. Palitan ang lahat ng admin policies para gamitin ang function

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
