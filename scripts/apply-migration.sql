-- Run this SQL in your Supabase SQL Editor to fix the display_name issue

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Update the users table with display_name from user_metadata
  UPDATE public.users
  SET 
    display_name = COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      CONCAT(
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        ' ',
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      ),
      NEW.email
    ),
    first_name = NEW.raw_user_meta_data->>'first_name',
    last_name = NEW.raw_user_meta_data->>'last_name'
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Also create a trigger for user updates to keep display_name in sync
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  -- Update the users table when user metadata changes
  IF OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data THEN
    UPDATE public.users
    SET 
      display_name = COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        CONCAT(
          COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
          ' ',
          COALESCE(NEW.raw_user_meta_data->>'last_name', '')
        ),
        NEW.email
      ),
      first_name = NEW.raw_user_meta_data->>'first_name',
      last_name = NEW.raw_user_meta_data->>'last_name'
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();

-- Fix existing users who don't have display_name set
UPDATE public.users 
SET 
  display_name = COALESCE(
    display_name,
    CONCAT(
      COALESCE(first_name, ''),
      ' ',
      COALESCE(last_name, '')
    ),
    email
  )
WHERE display_name IS NULL OR display_name = '';

-- Also update from auth.users metadata for existing users
UPDATE public.users 
SET 
  display_name = COALESCE(
    au.raw_user_meta_data->>'display_name',
    CONCAT(
      COALESCE(au.raw_user_meta_data->>'first_name', ''),
      ' ',
      COALESCE(au.raw_user_meta_data->>'last_name', '')
    ),
    au.email
  ),
  first_name = COALESCE(au.raw_user_meta_data->>'first_name', first_name),
  last_name = COALESCE(au.raw_user_meta_data->>'last_name', last_name)
FROM auth.users au
WHERE public.users.id = au.id
  AND (public.users.display_name IS NULL OR public.users.display_name = '');

