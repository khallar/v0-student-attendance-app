-- Create categorias table
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add categoria_id to materias
ALTER TABLE materias ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_materias_categoria_id ON materias(categoria_id);
