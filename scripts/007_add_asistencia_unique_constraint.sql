-- Add unique constraint on clase_id and alumno_id
-- This allows upsert operations to work correctly for realtime updates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'asistencias_clase_alumno_unique'
  ) THEN
    ALTER TABLE asistencias 
    ADD CONSTRAINT asistencias_clase_alumno_unique UNIQUE (clase_id, alumno_id);
  END IF;
END $$;
