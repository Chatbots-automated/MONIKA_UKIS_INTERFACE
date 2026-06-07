-- Create worker login codes table
CREATE TABLE IF NOT EXISTS worker_login_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_worker_login_codes_code ON worker_login_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_worker_login_codes_worker_id ON worker_login_codes(worker_id);

-- Add comment
COMMENT ON TABLE worker_login_codes IS 'Login codes for workers who do not have email accounts';

-- Enable RLS
ALTER TABLE worker_login_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view worker login codes" ON worker_login_codes;
DROP POLICY IF EXISTS "Admins can insert worker login codes" ON worker_login_codes;
DROP POLICY IF EXISTS "Admins can update worker login codes" ON worker_login_codes;
DROP POLICY IF EXISTS "Admins can delete worker login codes" ON worker_login_codes;

-- RLS policies for worker_login_codes
CREATE POLICY "Users can view worker login codes"
    ON worker_login_codes FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert worker login codes"
    ON worker_login_codes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can update worker login codes"
    ON worker_login_codes FOR UPDATE
    USING (true);

CREATE POLICY "Admins can delete worker login codes"
    ON worker_login_codes FOR DELETE
    USING (true);
