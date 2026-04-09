// Auth mock with localStorage
interface MockUser {
  id: string
  email: string
  name: string
}

const MOCK_USER_KEY = 'bedel_mock_user'

export function getMockUser(): MockUser | null {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem(MOCK_USER_KEY)
  return user ? JSON.parse(user) : null
}

export function setMockUser(email: string, name: string): MockUser {
  if (typeof window === 'undefined') throw new Error('Client side only')
  const user: MockUser = {
    id: 'bedel_' + Date.now(),
    email,
    name,
  }
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
  return user
}

export function clearMockUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MOCK_USER_KEY)
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!getMockUser()
}
