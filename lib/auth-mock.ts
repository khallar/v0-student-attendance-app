// Auth mock with localStorage
import { findBedelByEmail, isEmailAuthorized, type Bedel } from '@/config/bedeles'

interface MockUser {
  id: string
  email: string
  name: string
  rol: 'admin' | 'bedel'
}

const MOCK_USER_KEY = 'bedel_mock_user'

export function getMockUser(): MockUser | null {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem(MOCK_USER_KEY)
  return user ? JSON.parse(user) : null
}

// Intenta hacer login con un email - retorna el usuario si está autorizado, null si no
export function loginWithEmail(email: string): MockUser | null {
  if (typeof window === 'undefined') return null
  
  const bedel = findBedelByEmail(email)
  if (!bedel) {
    return null // Email no autorizado
  }
  
  const user: MockUser = {
    id: bedel.id,
    email: bedel.email,
    name: bedel.nombre,
    rol: bedel.rol,
  }
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
  return user
}

// Mantener compatibilidad con código existente, pero ahora valida contra la config
export function setMockUser(email: string, name: string): MockUser {
  if (typeof window === 'undefined') throw new Error('Client side only')
  
  // Intentar encontrar el bedel por email
  const bedel = findBedelByEmail(email)
  
  const user: MockUser = {
    id: bedel?.id || 'bedel_' + Date.now(),
    email,
    name: bedel?.nombre || name,
    rol: bedel?.rol || 'bedel',
  }
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
  return user
}

// Verificar si un email puede hacer login
export function canLogin(email: string): boolean {
  return isEmailAuthorized(email)
}

export function clearMockUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MOCK_USER_KEY)
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!getMockUser()
}
