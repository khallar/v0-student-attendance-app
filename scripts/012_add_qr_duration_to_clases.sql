-- Add qr_duracion_minutos column to track QR duration (5, 10, 30, or 60 minutes)
ALTER TABLE clases ADD COLUMN IF NOT EXISTS qr_duracion_minutos INTEGER DEFAULT 25;
