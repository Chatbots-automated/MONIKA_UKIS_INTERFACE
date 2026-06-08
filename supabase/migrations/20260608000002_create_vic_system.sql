-- ============================================
-- VIC (Veterinary Information Center) System
-- Store VIC credentials and client information
-- ============================================

BEGIN;

-- System-wide VIC credentials
CREATE TABLE IF NOT EXISTS public.vic_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  credential_name text NOT NULL,
  username text NOT NULL,
  password_encrypted text NULL,
  api_key text NULL,
  notes text NULL,
  
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vic_credentials_active 
  ON public.vic_credentials(is_active);

COMMENT ON TABLE public.vic_credentials IS 
'System-wide VIC (Veterinary Information Center) login credentials';

-- VIC clients (3 clients with name and personal code)
CREATE TABLE IF NOT EXISTS public.vic_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  client_name text NOT NULL,
  personal_code text NOT NULL,
  notes text NULL,
  
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT vic_clients_personal_code_unique UNIQUE (personal_code)
);

CREATE INDEX IF NOT EXISTS idx_vic_clients_active 
  ON public.vic_clients(is_active);

CREATE INDEX IF NOT EXISTS idx_vic_clients_personal_code 
  ON public.vic_clients(personal_code);

COMMENT ON TABLE public.vic_clients IS 
'VIC client information (name and personal code)';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_vic_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER vic_credentials_updated_at
  BEFORE UPDATE ON public.vic_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vic_updated_at();

CREATE TRIGGER vic_clients_updated_at
  BEFORE UPDATE ON public.vic_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vic_updated_at();

-- RLS Policies
ALTER TABLE public.vic_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vic_clients ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage VIC data
CREATE POLICY "Admins can view VIC credentials"
  ON public.vic_credentials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert VIC credentials"
  ON public.vic_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update VIC credentials"
  ON public.vic_credentials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete VIC credentials"
  ON public.vic_credentials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Same policies for vic_clients
CREATE POLICY "Admins can view VIC clients"
  ON public.vic_clients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert VIC clients"
  ON public.vic_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update VIC clients"
  ON public.vic_clients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete VIC clients"
  ON public.vic_clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vic_credentials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vic_clients TO authenticated;

COMMIT;
