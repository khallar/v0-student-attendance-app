-- Add qr_activo_desde column to track when QR was activated
-- QR is only valid for 5 minutes from activation
ALTER TABLE clases ADD COLUMN IF NOT EXISTS qr_activo_desde TIMESTAMPTZ DEFAULT NULL;
