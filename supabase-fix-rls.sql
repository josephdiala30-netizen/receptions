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

-- 8. RPC para makuha ang lahat ng users (admin lang, bypass RLS)
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Admin lang ang pwedeng tumingin ng lahat ng profiles
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data ->> 'role' = 'admin'
  ) THEN
    RETURN QUERY SELECT * FROM public.profiles ORDER BY username;
  ELSE
    RETURN QUERY SELECT * FROM public.profiles WHERE id = auth.uid();
  END IF;
END;
$$;

-- 9. RPC para i-update ang profile ng user (admin lang, bypass RLS)
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id UUID,
  p_username TEXT,
  p_name TEXT,
  p_email TEXT,
  p_role TEXT,
  p_is_admin BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Siguraduhing admin ang gumagawa
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data ->> 'role' = 'admin'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Update sa profiles table
  UPDATE public.profiles SET
    username = p_username,
    name = p_name,
    email = p_email,
    role = p_role,
    is_admin = p_is_admin
  WHERE id = p_user_id;

  -- Update din sa auth.users para mag-reflect sa JWT
  UPDATE auth.users SET raw_user_meta_data =
    COALESCE(raw_user_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'role', p_role,
      'username', p_username,
      'name', p_name,
      'is_admin', p_is_admin
    )
  WHERE id = p_user_id;

  -- Update sa userdata.profile para sa app
  UPDATE public.userdata SET data = data || jsonb_build_object(
    'profile', jsonb_build_object(
      'username', p_username,
      'name', p_name,
      'email', p_email,
      'role', p_role,
      'isAdmin', p_is_admin
    )
  ) WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- 10. RPC para mag-delete ng user (admin lang)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data ->> 'role' = 'admin'
  ) THEN
    RETURN FALSE;
  END IF;

  DELETE FROM public.userdata WHERE id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
  -- Note: hindi pwedeng i-delete ang auth.users sa SQL dahil kailangan ng service_role
  -- Pero pwede sa admin panel UI gamit ang supabase admin API
  RETURN TRUE;
END;
$$;

-- ==================== TEAM COLLABORATION (OPTION B) ====================

-- 11. RPC para makuha ang lahat ng username (para sa assignee dropdown)
-- Any authenticated user can call this - walang sensitive data
CREATE OR REPLACE FUNCTION public.get_all_usernames()
RETURNS TABLE(username TEXT, name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT username, name FROM public.profiles WHERE username IS NOT NULL AND role = 'executive_task' ORDER BY username;
$$;

-- 12. RPC para mag-assign ng task sa ibang user
-- Sinusulat ang task sa shared_tasks ng assignee gamit ang username
CREATE OR REPLACE FUNCTION public.assign_task(
  p_assignee_username TEXT,
  p_task JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignee_id UUID;
  v_existing JSONB;
  v_task_id BIGINT;
  v_filtered JSONB;
BEGIN
  -- Hanapin ang UUID ng assignee sa profiles
  SELECT id INTO v_assignee_id FROM public.profiles WHERE username = p_assignee_username;
  IF v_assignee_id IS NULL THEN RETURN FALSE; END IF;

  v_task_id := (p_task->>'id')::BIGINT;

  -- Kunin ang existing shared_tasks
  SELECT COALESCE(data->'shared_tasks', '[]'::jsonb) INTO v_existing
  FROM public.userdata WHERE id = v_assignee_id;

  -- Remove duplicate kung same ID (support update/re-assign)
  SELECT jsonb_agg(t) INTO v_filtered
  FROM jsonb_array_elements(v_existing) t
  WHERE (t->>'id')::BIGINT != v_task_id;

  IF v_filtered IS NULL THEN v_filtered := '[]'::jsonb; END IF;

  -- Alisin ang _shared flag bago i-store (client-side lang ito)
  p_task := p_task - '_shared';

  -- Add/update task
  v_filtered := v_filtered || jsonb_build_array(p_task);

  -- Save sa assignee's userdata
  UPDATE public.userdata
  SET data = data || jsonb_build_object('shared_tasks', v_filtered),
      updated_at = now()
  WHERE id = v_assignee_id;

  RETURN TRUE;
END;
$$;

-- 13. RPC para i-remove ang task sa shared_tasks ng assignee
-- (kapag dinelete o inalis ng creator ang assignment)
CREATE OR REPLACE FUNCTION public.remove_shared_task(
  p_assignee_username TEXT,
  p_task_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignee_id UUID;
  v_existing JSONB;
  v_filtered JSONB;
BEGIN
  SELECT id INTO v_assignee_id FROM public.profiles WHERE username = p_assignee_username;
  IF v_assignee_id IS NULL THEN RETURN FALSE; END IF;

  SELECT COALESCE(data->'shared_tasks', '[]'::jsonb) INTO v_existing
  FROM public.userdata WHERE id = v_assignee_id;

  SELECT jsonb_agg(t) INTO v_filtered
  FROM jsonb_array_elements(v_existing) t
  WHERE (t->>'id')::BIGINT != p_task_id;

  IF v_filtered IS NULL THEN v_filtered := '[]'::jsonb; END IF;

  UPDATE public.userdata
  SET data = data || jsonb_build_object('shared_tasks', v_filtered),
      updated_at = now()
  WHERE id = v_assignee_id;

  RETURN TRUE;
END;
$$;

-- 14. RPC para i-sync ang status update pabalik sa creator
-- (kapag minarkahan ng assignee ang task bilang done/progress)
CREATE OR REPLACE FUNCTION public.update_assigned_task_status(
  p_creator_username TEXT,
  p_task_id BIGINT,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator_id UUID;
  v_tasks JSONB;
  v_updated JSONB;
BEGIN
  SELECT id INTO v_creator_id FROM public.profiles WHERE username = p_creator_username;
  IF v_creator_id IS NULL THEN RETURN FALSE; END IF;

  SELECT COALESCE(data->'tasks', '[]'::jsonb) INTO v_tasks
  FROM public.userdata WHERE id = v_creator_id;

  SELECT jsonb_agg(
    CASE WHEN (t->>'id')::BIGINT = p_task_id THEN
      t || jsonb_build_object('status', p_status, 'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    ELSE t END
  ) INTO v_updated
  FROM jsonb_array_elements(v_tasks) t;

  IF v_updated IS NULL THEN v_updated := v_tasks; END IF;

  UPDATE public.userdata
  SET data = data || jsonb_build_object('tasks', v_updated),
      updated_at = now()
  WHERE id = v_creator_id;

  RETURN TRUE;
END;
$$;
