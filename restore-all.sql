-- ==================== RESTORE ALL ====================
-- Isang beses lang i-run sa Supabase Dashboard > SQL Editor
-- ======================================================

-- 1. TABLES (kung wala pa)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'executive_task',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS userdata (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE userdata ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. DROP lahat ng lumang policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own data" ON userdata;
DROP POLICY IF EXISTS "Users can read own userdata" ON userdata;
DROP POLICY IF EXISTS "Admins can view all userdata" ON userdata;
DROP POLICY IF EXISTS "Users can insert own userdata" ON userdata;
DROP POLICY IF EXISTS "Users can update own userdata" ON userdata;

-- 3. BAGONG RLS POLICIES (JWT lang, walang recursion)
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

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

-- 4. DROP lumang is_admin function (di na kailangan)
DROP FUNCTION IF EXISTS public.is_admin();

-- 5. RPC: get_all_profiles
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
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

-- 6. RPC: admin_update_profile
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id UUID, p_username TEXT, p_name TEXT, p_email TEXT, p_role TEXT, p_is_admin BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data ->> 'role' = 'admin'
  ) THEN RETURN FALSE; END IF;

  UPDATE public.profiles SET
    username = p_username, name = p_name, email = p_email, role = p_role, is_admin = p_is_admin
  WHERE id = p_user_id;

  UPDATE auth.users SET raw_user_meta_data =
    COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_role, 'username', p_username, 'name', p_name, 'is_admin', p_is_admin)
  WHERE id = p_user_id;

  UPDATE public.userdata SET data = data || jsonb_build_object(
    'profile', jsonb_build_object('username', p_username, 'name', p_name, 'email', p_email, 'role', p_role, 'isAdmin', p_is_admin)
  ) WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- 7. RPC: admin_delete_user
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data ->> 'role' = 'admin'
  ) THEN RETURN FALSE; END IF;

  DELETE FROM public.userdata WHERE id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- 8. RPC: get_all_usernames
CREATE OR REPLACE FUNCTION public.get_all_usernames()
RETURNS TABLE(username TEXT, name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT username, name FROM public.profiles WHERE username IS NOT NULL AND role = 'executive_task' ORDER BY username;
$$;

-- 9. RPC: assign_task
CREATE OR REPLACE FUNCTION public.assign_task(p_assignee_username TEXT, p_task JSONB)
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
  SELECT id INTO v_assignee_id FROM public.profiles WHERE username = p_assignee_username;
  IF v_assignee_id IS NULL THEN RETURN FALSE; END IF;

  v_task_id := (p_task->>'id')::BIGINT;

  SELECT COALESCE(data->'shared_tasks', '[]'::jsonb) INTO v_existing
  FROM public.userdata WHERE id = v_assignee_id;

  SELECT jsonb_agg(t) INTO v_filtered
  FROM jsonb_array_elements(v_existing) t
  WHERE (t->>'id')::BIGINT != v_task_id;

  IF v_filtered IS NULL THEN v_filtered := '[]'::jsonb; END IF;

  p_task := p_task - '_shared';
  v_filtered := v_filtered || jsonb_build_array(p_task);

  UPDATE public.userdata
  SET data = data || jsonb_build_object('shared_tasks', v_filtered), updated_at = now()
  WHERE id = v_assignee_id;

  RETURN TRUE;
END;
$$;

-- 10. RPC: remove_shared_task
CREATE OR REPLACE FUNCTION public.remove_shared_task(p_assignee_username TEXT, p_task_id BIGINT)
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
  SET data = data || jsonb_build_object('shared_tasks', v_filtered), updated_at = now()
  WHERE id = v_assignee_id;

  RETURN TRUE;
END;
$$;

-- 11. RPC: update_assigned_task_status
CREATE OR REPLACE FUNCTION public.update_assigned_task_status(p_creator_username TEXT, p_task_id BIGINT, p_status TEXT)
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
  SET data = data || jsonb_build_object('tasks', v_updated), updated_at = now()
  WHERE id = v_creator_id;

  RETURN TRUE;
END;
$$;

-- 12. RPC: get_userdata (ginagamit ng firebase-data.js)
CREATE OR REPLACE FUNCTION public.get_userdata(p_uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_result JSONB;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_caller_id AND raw_user_meta_data ->> 'role' = 'admin') THEN
    SELECT COALESCE(data, '{}'::jsonb) INTO v_result FROM public.userdata WHERE id = p_uid;
    RETURN v_result;
  END IF;

  IF v_caller_id = p_uid THEN
    SELECT COALESCE(data, '{}'::jsonb) INTO v_result FROM public.userdata WHERE id = p_uid;
    RETURN v_result;
  END IF;

  RETURN NULL;
END;
$$;

-- 13. TRIGGER: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, email, role, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'executive_task'),
    COALESCE((NEW.raw_user_meta_data ->> 'is_admin')::boolean, false)
  );
  INSERT INTO public.userdata (id, data) VALUES (NEW.id, '{}');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 14. REPAIR ROLES
UPDATE public.profiles p
SET
  role = COALESCE((SELECT (u.raw_user_meta_data ->> 'role') FROM auth.users u WHERE u.id = p.id), p.role, 'executive_task'),
  is_admin = COALESCE((SELECT ((u.raw_user_meta_data ->> 'is_admin'))::boolean FROM auth.users u WHERE u.id = p.id), (p.role = 'admin'), false)
WHERE p.role IS NULL OR p.role = 'executive_path' OR p.is_admin IS NULL;

UPDATE public.profiles SET is_admin = true WHERE role = 'admin' AND (is_admin IS NULL OR is_admin = false);

UPDATE auth.users SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE id IN (SELECT id FROM public.profiles WHERE role = 'admin')
  AND (raw_user_meta_data ->> 'role') IS DISTINCT FROM 'admin';

UPDATE auth.users SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', COALESCE((SELECT role FROM public.profiles WHERE id = auth.users.id), 'executive_task'))
WHERE (raw_user_meta_data ->> 'role') IS NULL;

-- 15. INDEXES
CREATE INDEX IF NOT EXISTS idx_userdata_data_gin ON public.userdata USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
