/*
  # Add automatic user creation trigger

  1. Purpose
    - Automatically create a public.users record when a new auth.users record is created
    - Ensures foreign key constraints are always satisfied
    - Prevents signup failures due to timing issues

  2. Changes
    - Creates a trigger function that runs after INSERT on auth.users
    - Creates the trigger to invoke the function
    - Ensures user records are always created atomically with auth signup
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Account'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
