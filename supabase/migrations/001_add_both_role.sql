-- Allow 'both' as a valid user role (driver + shipper combined)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('driver', 'shipper', 'both', 'admin'));

-- Also update the trigger to handle email-based signups (phone will be null initially)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (new.id, new.phone)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
