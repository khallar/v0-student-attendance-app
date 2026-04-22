-- Add unique constraint on clase_id and alumno_id if it doesn't exist
ALTER TABLE asistencias 
ADD CONSTRAINT IF NOT EXISTS asistencias_clase_alumno_unique UNIQUE (clase_id, alumno_id);
