-- ==================== FIX: Add Missing get_userdata RPC ====================
-- I-run ito sa Supabase Dashboard > SQL Editor (isang beses lang)
-- ========================================================================

-- 1. get_userdata RPC (ginagamit ng firebase-data.js loadFBData)
-- SECURITY DEFINER = bypass RLS, pero may sariling check
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

  -- Admin can read any user's data
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_caller_id AND raw_user_meta_data ->> 'role' = 'admin') THEN
    SELECT COALESCE(data, '{}'::jsonb) INTO v_result FROM public.userdata WHERE id = p_uid;
    RETURN v_result;
  END IF;

  -- Regular users can only read their own data
  IF v_caller_id = p_uid THEN
    SELECT COALESCE(data, '{}'::jsonb) INTO v_result FROM public.userdata WHERE id = p_uid;
    RETURN v_result;
  END IF;

  -- Unauthorized
  RETURN NULL;
END;
$$;

-- 2. Add GIN index for JSONB queries (performance)
CREATE INDEX IF NOT EXISTS idx_userdata_data_gin ON public.userdata USING GIN (data);

-- 3. Add index on profiles.username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- 4. Add index on profiles.role for get_all_usernames RPC
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
