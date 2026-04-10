-- Add horario field to clases table
ALTER TABLE clases ADD COLUMN IF NOT EXISTS horario TEXT;
