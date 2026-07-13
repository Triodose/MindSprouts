-- SQL schema for Supabase integration in MindSprout
-- Run these queries in your Supabase SQL Editor:

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-access to profiles" 
  ON public.profiles FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Allow users to update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 2. Create the mindmaps table
CREATE TABLE IF NOT EXISTS public.mindmaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on mindmaps
ALTER TABLE public.mindmaps ENABLE ROW LEVEL SECURITY;

-- Mindmaps policies: Users can only CRUD their own mindmaps
CREATE POLICY "Users can view own mindmaps" 
  ON public.mindmaps FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mindmaps" 
  ON public.mindmaps FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mindmaps" 
  ON public.mindmaps FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mindmaps" 
  ON public.mindmaps FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. Trigger to automatically create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
