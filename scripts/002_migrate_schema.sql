-- Drop existing tables to recreate with simplified schema
DROP TABLE IF EXISTS asistencias CASCADE;
DROP TABLE IF EXISTS clases CASCADE;
DROP TABLE IF EXISTS materia_alumnos CASCADE;
DROP TABLE IF EXISTS alumnos CASCADE;
DROP TABLE IF EXISTS materias CASCADE;

-- Materias
CREATE TABLE IF NOT EXISTS materias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  profesor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alumnos
CREATE TABLE IF NOT EXISTS alumnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Relacion materia-alumno
CREATE TABLE IF NOT EXISTS materia_alumnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE,
  alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(materia_id, alumno_id)
);

-- Clases/ocurrencias
CREATE TABLE IF NOT EXISTS clases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID REFERENCES materias(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ NOT NULL,
  codigo_autoasistencia TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asistencias
CREATE TABLE IF NOT EXISTS asistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clase_id UUID REFERENCES clases(id) ON DELETE CASCADE,
  alumno_id UUID REFERENCES alumnos(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'ausente',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clase_id, alumno_id)
);

-- Indices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_materia_alumnos_materia ON materia_alumnos(materia_id);
CREATE INDEX IF NOT EXISTS idx_materia_alumnos_alumno ON materia_alumnos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_clases_materia ON clases(materia_id);
CREATE INDEX IF NOT EXISTS idx_clases_fecha ON clases(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_clase ON asistencias(clase_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_alumno ON asistencias(alumno_id);
CREATE INDEX IF NOT EXISTS idx_clases_codigo ON clases(codigo_autoasistencia);
