-- Add performance indexes for faster queries

-- Index for fetching clases by materia (used frequently)
CREATE INDEX IF NOT EXISTS idx_clases_materia_id ON clases(materia_id);
CREATE INDEX IF NOT EXISTS idx_clases_materia_fecha ON clases(materia_id, fecha);

-- Index for fetching asistencias by clase (used frequently)
CREATE INDEX IF NOT EXISTS idx_asistencias_clase_id ON asistencias(clase_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_alumno_id ON asistencias(alumno_id);

-- Index for materia_alumnos lookups
CREATE INDEX IF NOT EXISTS idx_materia_alumnos_materia_id ON materia_alumnos(materia_id);
CREATE INDEX IF NOT EXISTS idx_materia_alumnos_alumno_id ON materia_alumnos(alumno_id);

-- Index for alumno DNI lookups (used in autoasistencia)
CREATE INDEX IF NOT EXISTS idx_alumnos_dni ON alumnos(dni);

-- Index for clase code lookups (used in QR autoasistencia)
CREATE INDEX IF NOT EXISTS idx_clases_codigo ON clases(codigo_autoasistencia);
