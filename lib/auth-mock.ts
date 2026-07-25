// Auth con validación de email + contraseña.
// El admin es fijo (config/bedeles). El resto de usuarios se validan
// contra la tabla `usuarios` de Supabase.
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOMBRE, isAdminEmail } from '@/config/bedeles'
import { getUsuarioByCredentials } from '@/lib/supabase/queries'

export interface MockUser {
  id: string
  email: string
  name: string
  rol: 'admin' | 'bedel'
  categoriaIds: string[] // categorías asignadas (vacío para admin = todas)
}

const MOCK_USER_KEY = 'bedel_mock_user'

export function getMockUser(): MockUser | null {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem(MOCK_USER_KEY)
  if (!user) return null
  try {
    const parsed = JSON.parse(user)
    // Compatibilidad: asegurar campos nuevos
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name,
      rol: parsed.rol === 'admin' ? 'admin' : 'bedel',
      categoriaIds: Array.isArray(parsed.categoriaIds) ? parsed.categoriaIds : [],
    }
  } catch {
    return null
  }
}

// Login con email + contraseña. Retorna el usuario si las credenciales son
// válidas, o null si no lo son.
export async function login(email: string, password: string): Promise<MockUser | null> {
  if (typeof window === 'undefined') return null

  const normalizedEmail = email.trim().toLowerCase()

  // Administrador fijo
  if (isAdminEmail(normalizedEmail)) {
    if (password !== ADMIN_PASSWORD) return null
    const user: MockUser = {
      id: 'admin',
      email: ADMIN_EMAIL,
      name: ADMIN_NOMBRE,
      rol: 'admin',
      categoriaIds: [],
    }
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
    return user
  }

  // Usuarios (bedeles) de la tabla usuarios
  const usuario = await getUsuarioByCredentials(normalizedEmail, password)
  if (!usuario) return null

  const user: MockUser = {
    id: usuario.id,
    email: usuario.email,
    name: usuario.nombre || usuario.email,
    rol: 'bedel',
    categoriaIds: usuario.categoria_ids || [],
  }
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
  return user
}

export function isAdmin(user: MockUser | null): boolean {
  return user?.rol === 'admin'
}

export function clearMockUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MOCK_USER_KEY)
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!getMockUser()
}
