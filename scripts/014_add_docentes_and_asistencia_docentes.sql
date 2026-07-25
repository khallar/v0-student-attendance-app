-- Agregar docentes ayudantes a las materias.
-- El campo existente "profesor" pasa a representar al "Profesor responsable".
ALTER TABLE materias ADD COLUMN IF NOT EXISTS docente_ayudante TEXT;
ALTER TABLE materias ADD COLUMN IF NOT EXISTS docente_ayudante_2 TEXT;

-- Asistencia de docentes por clase (la registra el bedel de forma manual).
-- Por defecto todos los docentes creados se consideran presentes.
CREATE TABLE IF NOT EXISTS asistencia_docentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id UUID REFERENCES clases(id) ON DELETE CASCADE,
  rol TEXT NOT NULL, -- 'responsable' | 'ayudante' | 'ayudante_2'
  nombre TEXT NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clase_id, rol)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_docentes_clase ON asistencia_docentes(clase_id);
