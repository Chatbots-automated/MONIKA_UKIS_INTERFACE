-- Add TPM mokėstis field to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tpm_mokestis numeric(10,2);

COMMENT ON COLUMN vehicles.tpm_mokestis IS 'TPM (Transport and Movement Tax) fee amount';
