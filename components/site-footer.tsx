'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getMockUser } from '@/lib/auth-mock'

export function SiteFooter() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  // Reflejar login/logout al cambiar de ruta, igual que la navegación.
  useEffect(() => {
    setUser(getMockUser())
  }, [pathname])

  // Ocultar el footer cuando no hay sesión (ej. pantalla de login),
  // manteniendo la coherencia con MainNav.
  if (!user) return null

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} AsistApp — Control de Asistencia</p>
        <p className="font-medium">Versión 1.0</p>
      </div>
    </footer>
  )
}
