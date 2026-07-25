// Configuración del administrador del sistema.
// El admin es un usuario fijo definido en código. El resto de los usuarios
// (bedeles) se crean y gestionan desde el ABM de Usuarios (menú Usuarios),
// y se almacenan en la tabla `usuarios` de Supabase.

export const ADMIN_EMAIL = 'admin@universidad.edu.ar'
export const ADMIN_PASSWORD = 'Admin2026!'
export const ADMIN_NOMBRE = 'Administrador'

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
}
