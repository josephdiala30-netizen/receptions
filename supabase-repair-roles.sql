-- ==================== REPAIR: Fix Wrong Roles in Profiles ====================
-- I-run ito kung mali ang role ng users (laging napupunta sa executive_path)
-- Kinukuha nito ang tamang role mula sa auth.users raw_user_meta_data
-- ==============================================================================

-- Siguraduhin na may is_admin column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- I-update ang profiles.role at profiles.is_admin gamit ang JWT metadata
UPDATE public.profiles p
SET
  role = COALESCE(
    (SELECT (u.raw_user_meta_data ->> 'role') FROM auth.users u WHERE u.id = p.id),
    p.role,
    'executive_task'
  ),
  is_admin = COALESCE(
    (SELECT ((u.raw_user_meta_data ->> 'is_admin'))::boolean FROM auth.users u WHERE u.id = p.id),
    (p.role = 'admin'),
    false
  )
WHERE p.role IS NULL OR p.role = 'executive_path'
   OR p.is_admin IS NULL;

-- I-set ang is_admin para sa mga admin
UPDATE public.profiles SET is_admin = true WHERE role = 'admin' AND (is_admin IS NULL OR is_admin = false);

-- Ipakita ang resulta
SELECT id, username, email, role, is_admin FROM public.profiles ORDER BY username;
