-- Add ubicacion field to materias
ALTER TABLE materias ADD COLUMN IF NOT EXISTS ubicacion TEXT;

-- Add ubicacion field to clases (copied from materia on creation)
ALTER TABLE clases ADD COLUMN IF NOT EXISTS ubicacion TEXT;

-- Change horarios: instead of single hora_desde/hora_hasta, use JSONB for per-day schedules
-- Format: {"l": {"desde": "08:00", "hasta": "12:00"}, "m": {"desde": "14:00", "hasta": "18:00"}}
ALTER TABLE materias ADD COLUMN IF NOT EXISTS horarios_por_dia JSONB DEFAULT '{}';

-- Keep hora_desde/hora_hasta for backwards compatibility but horarios_por_dia takes precedence
