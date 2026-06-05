-- ==================== SUPABASE SCHEMA ====================
-- Run this in Supabase Dashboard > SQL Editor
-- ==========================================================

-- 1. PROFILES table (linked to auth.users)
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

-- 2. USERDATA table (JSONB document matching old Firestore structure)
CREATE TABLE IF NOT EXISTS userdata (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE userdata ENABLE ROW LEVEL SECURITY;

-- 3.5 Helper function to check if user is admin (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true);
$$;

-- 4. RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- 5. RLS policies for userdata
CREATE POLICY "Users can view own data"
  ON userdata FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all userdata"
  ON userdata FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own data"
  ON userdata FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON userdata FOR UPDATE
  USING (auth.uid() = id);

-- 6. Helper function to auto-create profile on signup
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

-- 7. Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Seed superadmin account (run after creating via app or dashboard)
-- NOTE: Create the superadmin user via the app's registration first,
-- then run this to set is_admin = true:
-- UPDATE profiles SET is_admin = true, role = 'admin' WHERE username = 'superadmin';
