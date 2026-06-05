-- ==================== PERMANENT RLS FIX ====================
-- Copy-paste LAHAT sa Supabase Dashboard > SQL Editor, RUN isang beses lang
-- Hindi na kailangan ng is_admin() function - direkta sa JWT token kukuha ng role
-- Walang recursion guaranteed
-- ===========================================================

-- 1. Drop lahat ng old policies na may recursion
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

DROP POLICY IF EXISTS "Users can read own userdata" ON userdata;
DROP POLICY IF EXISTS "Admins can view all userdata" ON userdata;
DROP POLICY IF EXISTS "Users can insert own userdata" ON userdata;
DROP POLICY IF EXISTS "Users can update own userdata" ON userdata;

-- 2. PROFILES POLICIES (walang table query, JWT lang)

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- 3. USERDATA POLICIES (walang table query, JWT lang)

CREATE POLICY "Users can read own userdata"
  ON userdata FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all userdata"
  ON userdata FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can insert own userdata"
  ON userdata FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own userdata"
  ON userdata FOR UPDATE
  USING (auth.uid() = id);

-- 4. Siguraduhin na may is_admin column (kung wala pa)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 5. I-set ang role ng existing users sa profiles
UPDATE public.profiles SET is_admin = true WHERE role = 'admin' AND (is_admin IS NULL OR is_admin = false);

-- 6. I-set ang JWT metadata para sa existing admin users
-- Para mag-reflect agad ang role, i-update ang auth.users.raw_user_meta_data
UPDATE auth.users SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE id IN (SELECT id FROM public.profiles WHERE role = 'admin')
  AND (raw_user_meta_data ->> 'role') IS DISTINCT FROM 'admin';

UPDATE auth.users SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', COALESCE((SELECT role FROM public.profiles WHERE id = auth.users.id), 'executive_task'))
WHERE (raw_user_meta_data ->> 'role') IS NULL;

-- 7. TANGGALIN ang is_admin() function (opsyonal, pero para malinis)
DROP FUNCTION IF EXISTS public.is_admin();
