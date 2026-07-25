-- ABM de Usuarios: tabla de usuarios y relación con categorías
-- El administrador (admin@universidad.edu.ar) se maneja fijo en código.
-- Esta tabla almacena los usuarios (bedeles) que el admin crea y gestiona.

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nombre TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relación N:M entre usuarios y categorías
CREATE TABLE IF NOT EXISTS usuario_categorias (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, categoria_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_categorias_usuario ON usuario_categorias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_categorias_categoria ON usuario_categorias(categoria_id);
