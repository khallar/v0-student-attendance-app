-- Add comentario column to clases table
ALTER TABLE clases ADD COLUMN IF NOT EXISTS comentario TEXT;
